A-SOUNDSCAPE — MULTI-SOURCE OPEN AUDIO CATALOG

This version searches three catalogs: Openverse (an index of open-licensed audio from multiple providers), Internet Archive, and Wikimedia Commons. 'All catalogs' searches all three and merges/deduplicates the returned records. It uses a local Python server to avoid browser CORS issues. No API key is required for these searches.

WINDOWS STARTUP
1. Install Python 3 from https://www.python.org/downloads/ if needed.
2. Extract this ZIP to a normal folder.
3. Double-click START_WINDOWS.bat.
4. Keep the terminal window open.
5. Your browser opens automatically. If it does not, visit the exact localhost address printed in the terminal (the port may be 8001 or higher if 8000 is already in use).

HOW TO SEARCH
- The first search is prefilled with “sound effects” so the page does not start with an empty query.
- Use the Catalog dropdown to search All catalogs together or select Openverse, Internet Archive, or Wikimedia Commons directly.
- Search results are paginated; use Load more sounds to browse additional results.
- The server uses request timeouts to avoid waiting forever on a slow upstream source.

IMPORTANT
- An internet connection is required for online search and playback. The eight included demo sounds remain available as local examples.
- These catalogs contain music, speech, field recordings, sound effects, and other audio. They do not expose an actually unlimited result set: each provider has its own indexing, pagination, and rate limits. All catalogs mode expands discovery and keeps paging where the source allows it.
- Audio licenses and playback availability vary by recording. Open the original source page and verify the license before reusing audio.
- This site searches catalog metadata; it does not download or bundle lakhs of recordings into the ZIP.
