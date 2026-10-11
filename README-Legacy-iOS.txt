Doodland TV Legacy Web App - Playback Fix
========================================

This version fixes the broken player source that pointed to /api/stream/... .
That relative URL only works if a compatible backend is deployed at the same
origin; GitHub Pages and other static hosts do not run server.js. The video now uses the direct absolute ErsatzTV MPEG-TS URL, and the guide is read directly from the XMLTV URL.

PLAYBACK
- Open index.html from your HTTPS website in Safari on iOS 6 or iOS 8. The stream source is `/iptv/channel/1.ts`.
- Tap the native video play control. It does not autoplay or mute itself.
- If the player errors, tap the "open the stream directly" link. If that URL
  also fails in Safari, the problem is the stream endpoint, TLS/certificate
  trust, or stream format, not the page's JavaScript.

IMPORTANT
- The stream host must remain reachable at:
  https://eeeeeeee.taild40b43.ts.net/iptv/channel/1.ts
- The XMLTV endpoint must allow cross-origin requests (CORS) for the guide title
  to load. Video playback itself does not depend on the guide request succeeding.
- iOS 6 and iOS 8 are old enough that HTTPS certificate and TLS compatibility
  can still be a separate blocker. This package points the player at the direct MPEG-TS endpoint and removes the broken /api paths, but cannot override Safari's certificate checks or repair a server-side stream. Browser support for raw MPEG-TS varies, so test on the target iOS version.
- The included server.js is retained for reference, but is not required for this
  static-hosting version. Do not expect GitHub Pages to execute server.js.
- No autoplay, no forced mute, no MediaSource Extensions, no external player.


APPLE LINEN / ERA-SPECIFIC APPEARANCE
------------------------------------
- iOS 5-6 Safari user agents automatically receive the tiled dark Apple linen
  texture (`apple-linen-dark.png`). The existing blue navigation-bar gradient
  is retained for the skeuomorphic iOS 5-6 look.
- iOS 7-8 Safari user agents receive the tiled light linen texture
  (`apple-linen-light.jpg`), while the navigation bar and LIVE control become
  flat, with no gradient, glossy button bevel, or drop shadow.
- Both textures are local assets and tile/repeat; no external image requests
  are made. Other browsers retain the existing default styling.


## Version-specific app icons
- iOS 5–6: `app-icon.png` (original icon).
- iOS 7–8: `app-icon-ios7-8.png` (the supplied 144px icon).
- The page updates the apple-touch-icon, favicon, navigation icon, and channel icon based on the detected iOS generation. The web app manifest uses the 144px icon.
