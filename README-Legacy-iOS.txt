Doodland TV Legacy Web App - Playback Fix
========================================

This version fixes the broken player source that pointed to /api/stream/... .
That relative URL only works if a compatible backend is deployed at the same
origin; GitHub Pages and other static hosts do not run server.js. The video now
uses the real absolute ErsatzTV HLS URL directly, and the guide is read directly
from the XMLTV URL.

PLAYBACK
- Open index.html from your HTTPS website in Safari on iOS 6 or iOS 8.
- Tap the native video play control. It does not autoplay or mute itself.
- If the player errors, tap the "open the stream directly" link. If that URL
  also fails in Safari, the problem is the stream endpoint, TLS/certificate
  trust, or stream format, not the page's JavaScript.

IMPORTANT
- The stream host must remain reachable at:
  https://eeeeeeee.taild40b43.ts.net/iptv/channel/1.m3u8?mode=segmenter
- The XMLTV endpoint must allow cross-origin requests (CORS) for the guide title
  to load. Video playback itself does not depend on the guide request succeeding.
- iOS 6 and iOS 8 are old enough that HTTPS certificate and TLS compatibility
  can still be a separate blocker. This package removes the broken /api paths,
  but cannot override Safari's certificate checks or repair a server-side stream.
- The included server.js is retained for reference, but is not required for this
  static-hosting version. Do not expect GitHub Pages to execute server.js.
- No autoplay, no forced mute, no MediaSource Extensions, no external player.
