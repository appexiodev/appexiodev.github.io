const localSounds = [
 {id:'local-rain',title:'Soft Rain on Leaves',desc:'A gentle shower settling over a leafy garden.',category:'nature',duration:6,license:'Original demo',file:'sounds/soft-rain.wav',icon:'☂',bg:'#dce9d6',tags:'rain nature ambience water outdoor calm'},
 {id:'local-ocean',title:'Ocean Waves',desc:'Slow, rolling surf along a quiet shoreline.',category:'nature',duration:7,license:'Original demo',file:'sounds/ocean-waves.wav',icon:'≈',bg:'#d7e8e9',tags:'ocean sea waves water beach nature'},
 {id:'local-birds',title:'Morning Birds',desc:'Bright little calls in the early morning air.',category:'nature',duration:6,license:'Original demo',file:'sounds/morning-birds.wav',icon:'♬',bg:'#e9e6c9',tags:'birds nature morning forest chirping'},
 {id:'local-piano',title:'Soft Piano Chord',desc:'A warm, bell-like chord for a quiet moment.',category:'music',duration:5,license:'Original demo',file:'sounds/soft-piano.wav',icon:'♫',bg:'#e9dfe0',tags:'piano music chord soft calm cinematic'},
 {id:'local-pulse',title:'Sci-Fi Pulse',desc:'A mellow, futuristic synth atmosphere.',category:'effects',duration:5,license:'Original demo',file:'sounds/sci-fi-pulse.wav',icon:'◉',bg:'#dedcf0',tags:'sci-fi cinematic ambient synth effect space'},
 {id:'local-steps',title:'Footsteps on Gravel',desc:'A short sequence of steps across loose stone.',category:'effects',duration:5,license:'Original demo',file:'sounds/footsteps-gravel.wav',icon:'⌁',bg:'#e8dfd2',tags:'footsteps gravel walking foley effect'},
 {id:'local-sparkle',title:'Digital Sparkle',desc:'Tiny, bright tones for a friendly interface.',category:'effects',duration:3,license:'Original demo',file:'sounds/digital-sparkle.wav',icon:'✧',bg:'#f0e2c9',tags:'digital sparkle notification ui game effect'},
 {id:'local-thunder',title:'Distant Thunder',desc:'A low, distant rumble rolling through the sky.',category:'nature',duration:7,license:'Original demo',file:'sounds/distant-thunder.wav',icon:'☁',bg:'#d8dfe2',tags:'thunder storm rain weather rumble nature'}
];
const grid=document.getElementById('soundGrid'), input=document.getElementById('searchInput'), count=document.getElementById('resultCount');
let activeFilter='all', query='', currentSource='all', saved=new Set(JSON.parse(localStorage.getItem('asoundscape_saved')||'[]')), showSaved=false, current=null, audio=new Audio(), remoteSounds=[], isRemote=false, loading=false, currentPage=1, totalResults=0, hasMore=false;
const fmt=n=>{n=Math.max(0,Math.round(Number(n)||0));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function setStatus(msg,error=false){const el=document.getElementById('apiStatus');if(el){el.textContent=msg;el.classList.toggle('api-error',error)}}
function getAll(){return isRemote?remoteSounds:localSounds}
function render(){
 let list=getAll().filter(s=>(activeFilter==='all'||s.category===activeFilter|| (activeFilter==='effects'&&s.category==='sound effects'))&&(!query||`${s.title} ${s.desc} ${(s.tags||[]).join? s.tags.join(' '):s.tags||''} ${s.category} ${s.username||''}`.toLowerCase().includes(query.toLowerCase()))&&(!showSaved||saved.has(String(s.id))));
 const sort=document.getElementById('sortSelect').value;
 if(sort==='az')list.sort((a,b)=>a.title.localeCompare(b.title)); if(sort==='duration')list.sort((a,b)=>(a.duration||0)-(b.duration||0));
 count.textContent=isRemote?`Showing ${list.length} loaded · ${totalResults.toLocaleString()} catalog items${showSaved?' · saved':''}`:`Showing ${list.length} sound${list.length===1?'':'s'}${showSaved?' · saved':''}`;
 const moreBtn=document.getElementById('loadMoreBtn');if(moreBtn){moreBtn.hidden=!isRemote||!hasMore||showSaved;moreBtn.disabled=loading;moreBtn.textContent=loading?'Loading…':'Load more sounds ↓';}
 grid.innerHTML=list.map(s=>`<article class="sound-card ${s.remote?'remote':''} ${String(current)===String(s.id)&&!audio.paused?'playing':''}" data-id="${esc(s.id)}">
 <div class="sound-art ${s.remote?'remote-art':''}" style="--artbg:${s.bg||'#dce9d6'}"><div class="card-top"><span class="category-label">${esc(s.category||'sound')}</span><button class="save-btn ${saved.has(String(s.id))?'saved':''}" data-save="${esc(s.id)}" aria-label="Save ${esc(s.title)}">${saved.has(String(s.id))?'♥':'♡'}</button></div><div class="art-icon">${s.remote?'♫':(s.icon||'♫')}</div><button class="play-btn" data-play="${esc(s.id)}" aria-label="Play ${esc(s.title)}">${String(current)===String(s.id)&&!audio.paused?'Ⅱ':'▶'}</button></div>
 <div class="sound-details"><h3 class="sound-title">${esc(s.title)}</h3><p class="sound-description">${esc(s.desc||'Open audio recording.')}</p><div class="card-meta"><span>${fmt(s.duration)}</span><span>${s.remote?`<a class="source-link" href="${esc(s.permalink||'#')}" target="_blank" rel="noopener" onclick="event.stopPropagation()">↗ ${esc(s.username||'Archive')} · Source</a>`:'◉ Original demo'}</span></div></div></article>`).join('');
 document.getElementById('emptyState').hidden=!!list.length||loading;
 document.getElementById('savedCount').textContent=saved.size;
}
function toArchiveSound(s){
 const tags=Array.isArray(s.tags)?s.tags:[];
 const license=s.license||'Check item rights';
 return {id:`remote-${s.id}`,archiveId:s.id,title:s.title||'Untitled audio',desc:s.description||'Audio recording hosted by the Internet Archive.',category:s.category||'effects',duration:s.duration||0,username:s.creator||'Open audio contributor',provider:s.source||'Open audio catalog',licenseName:license,license,licenseUrl:s.licenseurl||'',file:s.file||'',icon:'♫',bg:['#dce9d6','#d7e8e9','#e9dfe0','#dedcf0','#e8dfd2'][Math.abs(String(s.id).length)%5],tags,remote:true,permalink:s.permalink||`https://archive.org/details/${encodeURIComponent(s.id)}`};
}
async function searchSounds(q,reset=true){
 if(reset){remoteSounds=[];currentPage=1;totalResults=0;hasMore=false;}
 loading=true;isRemote=true;setStatus(currentSource==='archive'?'Searching Internet Archive…':currentSource==='commons'?'Searching Wikimedia Commons…':currentSource==='openverse'?'Searching Openverse…':'Searching Openverse, Internet Archive, and Wikimedia Commons together…');render();
 try{
  const params=new URLSearchParams({q:q||'',page:String(currentPage),limit:'20',source:currentSource});
  const response=await fetch(`/api/sounds?${params.toString()}`,{headers:{Accept:'application/json'}});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||`Audio catalog error ${response.status}`);
  const rows=Array.isArray(data.results)?data.results:[];
  const mapped=rows.map(toArchiveSound).filter(s=>s.file);
  remoteSounds=reset?mapped:remoteSounds.concat(mapped);
  totalResults=Number(data.total)||0;hasMore=!!data.has_more&&rows.length>0;loading=false;isRemote=true;
  setStatus(`Connected to ${data.provider||'open audio catalogs'} · approximately ${totalResults.toLocaleString()} matching catalog records across selected sources · no API key required.${data.notice?' '+data.notice:''}`);
  document.getElementById('sectionTitle').innerHTML=(q?`Results for “${esc(q)}”`:'Open audio catalog')+'<span>.</span>';render();
  if(!rows.length)setStatus('No playable recordings on this page. Try another keyword or switch catalog sources.',true);
 }catch(err){
  loading=false;isRemote=false;hasMore=false;
  setStatus(`${err.message}. Check your internet connection, then search again. Your included demo sounds remain available below.`,true);
  render();console.error(err);
 }
}
function loadMoreSounds(){if(loading||!hasMore)return;currentPage+=1;searchSounds(query,false)}
function openApiModal(){document.getElementById('apiModal').hidden=false}
function play(id){
 const s=getAll().find(x=>String(x.id)===String(id));if(!s)return;
 if(String(current)===String(id)&&!audio.paused){audio.pause();syncPlayer();render();return}
 if(s.remote&&!s.file){setStatus('No playable preview was returned for this sound.',true);return}
 current=id;audio.pause();audio=new Audio(s.file);audio.preload='none';
 audio.addEventListener('timeupdate',()=>{document.getElementById('npProgress').style.width=(audio.duration?audio.currentTime/audio.duration*100:0)+'%';});
 audio.addEventListener('ended',()=>{syncPlayer();render()});
 audio.addEventListener('error',()=>{document.getElementById('npMeta').textContent='Preview unavailable. Open the sound page for details.';});
 document.getElementById('npTitle').textContent=s.title;document.getElementById('npMeta').textContent=s.remote?`${s.username} · ${s.licenseName} · ${s.provider||'Open audio catalog'}`:`${s.category.toUpperCase()} · ${fmt(s.duration)} · Original demo`;
 audio.play().then(()=>{document.getElementById('nowPlaying').classList.add('visible');syncPlayer();render()}).catch(()=>{document.getElementById('nowPlaying').classList.add('visible');syncPlayer();render()});
}
function syncPlayer(){const s=getAll().find(x=>String(x.id)===String(current));document.getElementById('npPlay').textContent=audio.paused?'▶':'Ⅱ';if(s){document.getElementById('npTitle').textContent=s.title;document.getElementById('npMeta').textContent=s.remote?`${s.username} · ${s.licenseName} · ${s.provider||'Open audio catalog'}`:`${s.category.toUpperCase()} · ${fmt(s.duration)} · Original demo`;}if(!audio.paused)document.getElementById('nowPlaying').classList.add('visible')}
grid.addEventListener('click',e=>{
 const save=e.target.closest('[data-save]');if(save){const id=String(save.dataset.save);saved.has(id)?saved.delete(id):saved.add(id);localStorage.setItem('asoundscape_saved',JSON.stringify([...saved]));render();return}
 const p=e.target.closest('[data-play]');if(p)play(p.dataset.play);
});
document.getElementById('searchForm').addEventListener('submit',e=>{e.preventDefault();query=input.value.trim();showSaved=false;searchSounds(query);document.getElementById('explore').scrollIntoView({behavior:'smooth'})});
input.addEventListener('input',()=>{query=input.value.trim();if(!isRemote)render();});
document.querySelectorAll('[data-search]').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.search;query=b.dataset.search;showSaved=false;searchSounds(query);document.getElementById('explore').scrollIntoView({behavior:'smooth'})}));
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{activeFilter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));render()}));
document.getElementById('sortSelect').addEventListener('change',render);
document.getElementById('savedToggle').addEventListener('click',()=>{showSaved=!showSaved;document.getElementById('sectionTitle').innerHTML=showSaved?'Your saved sounds<span>.</span>':(isRemote?(query?`Results for “${esc(query)}”<span>.</span>`:'Open audio catalog<span>.</span>'):'Explore sounds<span>.</span>');render();document.getElementById('explore').scrollIntoView({behavior:'smooth'})});
document.getElementById('resetSearch').addEventListener('click',()=>{query='';input.value='';activeFilter='all';showSaved=false;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('selected',x.dataset.filter==='all'));searchSounds('')});
document.getElementById('npPlay').addEventListener('click',()=>{if(!current)return;if(audio.paused)audio.play().then(syncPlayer);else audio.pause();syncPlayer();render()});
document.getElementById('npClose').addEventListener('click',()=>{audio.pause();document.getElementById('nowPlaying').classList.remove('visible');render()});
document.getElementById('menuBtn').addEventListener('click',()=>document.querySelector('.nav').classList.toggle('open'));
document.getElementById('apiSettingsBtn').addEventListener('click',openApiModal);
document.getElementById('apiClose').addEventListener('click',()=>document.getElementById('apiModal').hidden=true);
document.getElementById('apiModal').addEventListener('click',e=>{if(e.target.id==='apiModal')e.currentTarget.hidden=true});
document.getElementById('saveApiKey').addEventListener('click',()=>{document.getElementById('apiModal').hidden=true;searchSounds(input.value.trim())});
document.getElementById('loadMoreBtn').addEventListener('click',loadMoreSounds);
document.getElementById('sourceSelect')?.addEventListener('change',e=>{currentSource=e.target.value;showSaved=false;searchSounds(query)});
input.value='sound effects';query='sound effects';render();searchSounds(query);
