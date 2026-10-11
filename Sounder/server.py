#!/usr/bin/env python3
"""A-Soundscape multi-source open audio search adapter.
Primary source: Openverse open-licensed audio index (aggregates multiple providers).
Secondary source/fallback: Internet Archive's public audio catalog.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, urlencode, quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from concurrent.futures import ThreadPoolExecutor, wait
from pathlib import Path
import json, os, re, html, socket, threading, webbrowser

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
IA = 'https://archive.org'
OV = 'https://api.openverse.org/v1/audio/'
COMMONS = 'https://commons.wikimedia.org/w/api.php'
USER_AGENT = 'A-Soundscape/3.0 (open audio discovery app)'


def fetch_json(url, timeout=8):
    req = Request(url, headers={'User-Agent': USER_AGENT, 'Accept': 'application/json'})
    with urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode('utf-8', 'replace'))


def clean_text(value, fallback=''):
    if isinstance(value, list): value = ', '.join(str(v) for v in value[:4])
    value = html.unescape(re.sub(r'<[^>]+>', ' ', str(value or fallback)))
    return re.sub(r'\s+', ' ', value).strip()


def openverse_search(q, page, limit):
    # Openverse indexes open-licensed audio from multiple providers. Anonymous search is supported.
    query = (q or '').strip() or 'sound effects'
    params = urlencode({'q': query, 'page': page, 'page_size': min(20, limit), 'filter_dead': 'true'})
    data = fetch_json(OV + '?' + params, timeout=9)
    raw = data.get('results') or []
    items = []
    for row in raw:
        audio_url = row.get('url')
        if not audio_url:
            alts = row.get('alt_files') or []
            audio_url = next((a.get('url') for a in alts if a.get('url')), '')
        if not audio_url: continue
        duration = row.get('duration') or 0
        try: duration = float(duration) / 1000 if float(duration) > 1000 else float(duration)
        except (TypeError, ValueError): duration = 0
        tags = row.get('tags') or []
        if isinstance(tags, list): tags = [clean_text(t.get('name') if isinstance(t, dict) else t) for t in tags]
        else: tags = []
        title = clean_text(row.get('title'), 'Untitled audio')
        creator = clean_text(row.get('creator'), 'Openverse contributor')
        provider = clean_text(row.get('provider') or row.get('source'), 'Openverse')
        landing = row.get('foreign_landing_url') or row.get('detail_url') or 'https://openverse.org/'
        license_name = clean_text(row.get('license'), 'Check source license').upper()
        license_url = row.get('license_url') or ''
        text = (title + ' ' + ' '.join(tags)).lower()
        category = 'nature' if any(w in text for w in ('bird','rain','water','nature','wind','animal','weather','ocean','forest','thunder')) else 'music' if any(w in text for w in ('music','piano','guitar','melody','song','album')) else 'effects'
        items.append({'id': 'ov-' + str(row.get('id') or len(items)), 'title': title,
                      'description': clean_text(row.get('attribution') or row.get('description'), f'Open-licensed audio from {provider}.')[:220],
                      'creator': creator, 'duration': duration, 'license': license_name,
                      'licenseurl': license_url, 'file': audio_url, 'tags': tags[:12],
                      'category': category, 'permalink': landing, 'source': provider})
    total = int(data.get('result_count') or data.get('count') or len(items))
    page_count = int(data.get('page_count') or 0)
    return {'results': items, 'total': total, 'page': page, 'limit': limit,
            'has_more': bool(page_count and page < page_count and items),
            'provider': 'Openverse + indexed open-audio providers', 'mode': 'openverse'}


def safe_ia_query(q):
    q = re.sub(r'[\\+\-!(){}\[\]^"~*?:/]', ' ', (q or '').strip())
    q = re.sub(r'\s+', ' ', q).strip()[:100]
    if not q: q = 'sound effects'
    phrase = '"' + q.replace('"', ' ') + '"'
    return f'mediatype:audio AND (title:{phrase} OR subject:{phrase} OR description:{phrase} OR creator:{phrase})'


def ia_item(doc):
    identifier = doc.get('identifier')
    if not identifier: return None
    try:
        data = fetch_json(f'{IA}/metadata/{quote(identifier, safe="")}', timeout=5)
        meta = data.get('metadata') or {}
        files = data.get('files') or []
        candidates = []
        for f in files:
            name = f.get('name', '')
            lower = name.lower()
            if f.get('private') is True or f.get('private') == 'true': continue
            if not lower.endswith(('.mp3', '.ogg', '.oga', '.wav', '.m4a', '.flac')): continue
            if any(x in lower for x in ('_meta.', '_files.', '_reviews.', 'thumb', 'cover', 'sample.jpg')): continue
            if int(f.get('size') or 0) > 150_000_000: continue
            rank = 0 if lower.endswith('.mp3') else 1 if lower.endswith(('.ogg', '.oga')) else 2 if lower.endswith('.m4a') else 3 if lower.endswith('.wav') else 4
            candidates.append((rank, int(f.get('size') or 0), f))
        if not candidates: return None
        candidates.sort(key=lambda x: (x[0], x[1]))
        f = candidates[0][2]
        title = clean_text(meta.get('title') or doc.get('title') or identifier)
        creator = clean_text(meta.get('creator') or doc.get('creator') or 'Internet Archive contributor')
        description = clean_text(meta.get('description') or doc.get('description') or 'Public audio recording hosted by Internet Archive.')[:220]
        subjects = meta.get('subject') or doc.get('subject') or []
        if isinstance(subjects, str): subjects = [subjects]
        license_url = meta.get('licenseurl') or doc.get('licenseurl') or ''
        filename = f.get('name', '')
        url = f'{IA}/download/{quote(identifier, safe="")}/{quote(filename, safe="")}'
        hay = (title + ' ' + description + ' ' + ' '.join(map(str, subjects))).lower()
        category = 'nature' if any(w in hay for w in ('bird','rain','water','nature','wind','animal','weather','ocean','forest')) else 'music' if any(w in hay for w in ('music','piano','guitar','melody','song','album')) else 'effects'
        try: duration = float(f.get('length') or f.get('duration') or 0)
        except (ValueError, TypeError): duration = 0
        return {'id': 'ia-' + identifier, 'title': title, 'description': description,
                'creator': creator, 'duration': duration, 'license': clean_text(license_url.rsplit('/',1)[-1] if license_url else 'Check item rights'),
                'licenseurl': license_url, 'file': url, 'tags': [str(x) for x in subjects[:12]],
                'category': category, 'permalink': f'{IA}/details/{quote(identifier, safe="")}', 'source': 'Internet Archive'}
    except Exception:
        return None


def archive_search(q, page, limit):
    # Internet Archive supports deep paging through its public advanced-search endpoint.
    rows = min(max(1, limit), 12)
    params = [('q', safe_ia_query(q)), ('fl[]', 'identifier'), ('fl[]', 'title'),
              ('fl[]', 'creator'), ('fl[]', 'description'), ('fl[]', 'subject'),
              ('fl[]', 'licenseurl'), ('rows', str(rows)), ('page', str(page)),
              ('output', 'json'), ('sort[]', 'downloads desc')]
    data = fetch_json(f'{IA}/advancedsearch.php?{urlencode(params)}', timeout=9)
    response = data.get('response') or {}
    docs = response.get('docs') or []
    found = int(response.get('numFound') or 0)
    items = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(ia_item, doc) for doc in docs]
        done, pending = wait(futures, timeout=10)
        for future in done:
            try:
                item = future.result()
                if item: items.append(item)
            except Exception: pass
        for future in pending:
            future.cancel()
    order = {d.get('identifier'): i for i, d in enumerate(docs)}
    items.sort(key=lambda x: order.get(x['id'][3:], 999))
    return {'results': items[:rows], 'total': found, 'page': page, 'limit': rows,
            'has_more': page * rows < found, 'provider': 'Internet Archive', 'mode': 'archive'}


def commons_search(q, page, limit):
    # Wikimedia Commons public API; page by offset so users can keep browsing batches.
    terms = (q or '').strip() or 'sound effects'
    params = {
        'action': 'query', 'format': 'json', 'formatversion': '2',
        'generator': 'search', 'gsrsearch': f'{terms} filemime:audio',
        'gsrnamespace': '6', 'gsrlimit': str(min(max(1, limit), 20)),
        'gsroffset': str((page - 1) * min(max(1, limit), 20)),
        'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiurlwidth': '320'
    }
    data = fetch_json(COMMONS + '?' + urlencode(params), timeout=9)
    pages = ((data.get('query') or {}).get('pages') or [])
    items = []
    for row in pages:
        infos = row.get('imageinfo') or []
        if not infos: continue
        info = infos[0]
        url = info.get('url') or ''
        if not url: continue
        ext = info.get('extmetadata') or {}
        def meta(key, default=''):
            val = ext.get(key) or {}
            return clean_text(val.get('value') if isinstance(val, dict) else val, default)
        title = clean_text(row.get('title', '').removeprefix('File:'), 'Untitled audio')
        creator = meta('Artist', 'Wikimedia Commons contributor')
        license_name = meta('LicenseShortName', 'Check source rights')
        license_url = meta('LicenseUrl', '')
        description = meta('ImageDescription', 'Audio file hosted on Wikimedia Commons.')[:220]
        items.append({'id': 'wc-' + str(row.get('pageid') or title), 'title': title,
                      'description': description, 'creator': creator, 'duration': 0,
                      'license': license_name, 'licenseurl': license_url, 'file': url,
                      'tags': [], 'category': 'effects',
                      'permalink': 'https://commons.wikimedia.org/wiki/' + quote(row.get('title', ''), safe=''),
                      'source': 'Wikimedia Commons'})
    total = int(((data.get('query') or {}).get('searchinfo') or {}).get('totalhits') or len(items))
    return {'results': items, 'total': total, 'page': page, 'limit': limit,
            'has_more': page * min(max(1, limit), 20) < total, 'provider': 'Wikimedia Commons', 'mode': 'commons'}


def merged_search(q, page, limit):
    # Query three catalogs independently. Openverse itself aggregates multiple providers;
    # Internet Archive provides deeper paging beyond Openverse's anonymous depth limit.
    outputs = {}
    errors = []
    jobs = {}
    with ThreadPoolExecutor(max_workers=3) as pool:
        jobs[pool.submit(openverse_search, q, page, min(limit, 20))] = 'Openverse'
        jobs[pool.submit(archive_search, q, page, min(limit, 12))] = 'Internet Archive'
        jobs[pool.submit(commons_search, q, page, min(limit, 12))] = 'Wikimedia Commons'
        done, pending = wait(jobs, timeout=13)
        for future in done:
            name = jobs[future]
            try: outputs[name] = future.result()
            except Exception as exc: errors.append(f'{name}: {exc}')
        for future in pending:
            errors.append(f'{jobs[future]}: timed out')
            future.cancel()
    # Round-robin sources to make each page useful and avoid one catalog crowding out others.
    lists = [outputs[k].get('results', []) for k in ('Openverse', 'Internet Archive', 'Wikimedia Commons') if k in outputs]
    merged, seen = [], set()
    max_len = max((len(lst) for lst in lists), default=0)
    for idx in range(max_len):
        for lst in lists:
            if idx >= len(lst): continue
            item = lst[idx]
            key = (item.get('file') or item.get('permalink') or item.get('id') or '').lower()
            if not key or key in seen: continue
            seen.add(key); merged.append(item)
    has_more = any(bool(x.get('has_more')) for x in outputs.values())
    total = sum(int(x.get('total') or 0) for x in outputs.values())
    providers = ' + '.join(outputs.keys())
    if errors: providers += ' (some sources temporarily unavailable)'
    return {'results': merged[:limit], 'total': total, 'page': page, 'limit': limit,
            'has_more': has_more, 'provider': providers or 'Open audio catalogs',
            'mode': 'all', 'notice': '; '.join(errors) if errors else ''}


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/sounds':
            qs = parse_qs(parsed.query)
            q = qs.get('q', [''])[0]
            try: page = max(1, min(1000000, int(qs.get('page', ['1'])[0])))
            except ValueError: page = 1
            try: limit = max(1, min(20, int(qs.get('limit', ['20'])[0])))
            except ValueError: limit = 20
            source = qs.get('source', ['all'])[0]
            if source == 'archive':
                try: self.send_json(200, archive_search(q, page, limit))
                except Exception as e: self.send_json(502, {'error': 'Internet Archive search failed. Try another keyword.', 'detail': str(e), 'results': []})
                return
            if source == 'commons':
                try: self.send_json(200, commons_search(q, page, limit))
                except Exception as e: self.send_json(502, {'error': 'Wikimedia Commons search failed. Try another keyword.', 'detail': str(e), 'results': []})
                return
            if source == 'openverse':
                try: self.send_json(200, openverse_search(q, page, limit))
                except Exception as e: self.send_json(502, {'error': 'Openverse search failed. Try another keyword or select All catalogs.', 'detail': str(e), 'results': []})
                return
            try:
                self.send_json(200, merged_search(q, page, limit))
            except Exception as e:
                self.send_json(502, {'error': 'Audio catalogs are temporarily unavailable. Try again in a moment.', 'detail': str(e), 'results': []})
            return
        if parsed.path == '/api/health':
            self.send_json(200, {'ok': True, 'providers': ['Openverse', 'Internet Archive', 'Wikimedia Commons'], 'requires_key': False})
            return
        return super().do_GET()

    def send_json(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

if __name__ == '__main__':
    server = None
    preferred = int(os.environ.get('ASOUND_PORT', '8000'))
    for port in range(preferred, preferred + 11):
        try:
            server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
            break
        except OSError:
            continue
    if server is None:
        raise SystemExit('Could not find a free port between 8000 and 8010. Close another local server and try again.')
    url = f'http://localhost:{server.server_address[1]}'
    print(f'A-Soundscape running at {url}')
    print('Catalogs: Openverse, Internet Archive, and Wikimedia Commons.')
    print('All catalogs are searched together; source limits/rate limits still apply.')
    print('Searches are bounded by timeouts so the page should not wait forever.')
    print('Your browser will open automatically. Keep this terminal open; press Ctrl+C to stop.')
    if not os.environ.get('ASOUND_NO_BROWSER'):
        threading.Timer(1.0, webbrowser.open, args=(url,)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nA-Soundscape stopped.')
    finally:
        server.server_close()
