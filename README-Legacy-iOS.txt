Doodland TV Legacy Web App
==========================

Designed to keep the front end compatible with iOS 6 Safari and iOS 8 Safari.

IMPORTANT DEPLOYMENT NOTES
- Upload these files to the same origin as the server/Worker that provides /api/now-playing and /api/stream/.
- The player uses Safari's native HLS support, not MediaSource Extensions or an external JavaScript player.
- It does not autoplay or automatically mute.
- This is a web app, not an iOS App Store app. On iOS 6, open the hosted page in Safari, then use Share > Add to Home Screen.
- If you deploy it under a subdirectory rather than the domain root, change the two /api/... paths in index.html and app.js to match that deployment.
- The included server.js is the backend from the supplied ZIP. It must be deployed as a compatible edge Worker/runtime. Static hosting alone will not provide the /api endpoints.
- Old iOS versions can have modern HTTPS/TLS certificate compatibility issues. If the page loads but the video reports an error, test the manifest URL in Safari and check the hosting/TLS setup.
