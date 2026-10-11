A-SOUNDSCAPE — GITHUB PAGES BUILD

WHY THIS BUILD FIXES THE GITHUB ERROR
GitHub Pages only hosts static files; it does not run server.py. The previous app called /api/sounds, so GitHub returned a 404 HTML page and JavaScript then failed while trying to parse that HTML as JSON. This build calls the public Openverse audio API directly from the browser and no longer calls /api/sounds.

PUBLISH ON GITHUB PAGES
1. Extract this ZIP.
2. Upload the contents (index.html, app.js, style.css, sounds/, favicon.ico if present) into the root of your GitHub repository. Do not upload only the ZIP.
3. In the repository open Settings → Pages.
4. Choose Deploy from a branch, select main and /(root), then Save.
5. Wait for GitHub Pages to publish, then refresh the published URL.

CATALOG LIMITATION
This static GitHub Pages build uses Openverse directly. It cannot run the Python backend, so Internet Archive, Wikimedia Commons, Freesound, and Jamendo are not combined in this build. To enable multiple catalogs together, host server.py on a separate Python hosting service and configure the frontend to use that backend URL. API availability, pagination, preview URLs, rate limits, and license terms depend on the provider; results are not literally unlimited.

TROUBLESHOOTING
- If Openverse is blocked or rate-limited, try again later or search a different term.
- Demo sounds are stored in sounds/ and should play from the GitHub Pages site.
- If you use a project URL like https://USERNAME.github.io/a-soundscape/, upload the files to the repository root. The app's demo audio paths are relative, so they work in a project subpath.
- favicon.ico 404 is cosmetic and does not prevent search or playback.

RIGHTS
Open each source item to check its license before reusing audio. A catalog listing does not automatically grant permission for every use.
