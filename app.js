(function () {
  // Detect iOS generation with ES5 syntax for old Mobile Safari.
  var ua = navigator.userAgent || "";
  var ios = /OS ([0-9]+)[._]/.exec(ua);
  var body = document.body;
  var era = "modern";
  if (/iPhone|iPad|iPod/.test(ua) && ios) {
    var major = parseInt(ios[1], 10);
    if (major >= 5 && major <= 6) { body.className += " ios5-6"; era = "linen"; }
    else if (major >= 7 && major <= 8) { body.className += " ios7-8"; era = "flat"; }
  }

  // Use the original icon on iOS 5-6 and the 144px icon on iOS 7-8.
  // The original icon remains the fallback for non-iOS and unrecognized versions.
  var iconFile = era === "flat" ? "app-icon-ios7-8.png" : "app-icon.png";
  var iconLinks = document.getElementById("apple-touch-icon");
  var faviconLink = document.getElementById("favicon-icon");
  var iconImages = document.getElementsByTagName("img");
  var iconIndex;
  if (iconLinks) iconLinks.setAttribute("href", iconFile + "?v=3");
  if (faviconLink) faviconLink.setAttribute("href", iconFile + "?v=3");
  for (iconIndex = 0; iconIndex < iconImages.length; iconIndex++) {
    if (/(^|\/)app-icon\.png$/.test(iconImages[iconIndex].getAttribute("src") || "")) {
      iconImages[iconIndex].setAttribute("src", iconFile);
    }
  }

  // Defaults: linen/dark on iOS 5-6, flat/light on iOS 7-8.
  var savedTheme = null;
  try { savedTheme = window.localStorage.getItem("doodland-tv-theme"); } catch (ignore) {}
  var theme = (savedTheme === "light" || savedTheme === "dark") ? savedTheme : (era === "linen" ? "dark" : "light");
  function applyTheme(nextTheme) {
    body.className = body.className.replace(/\s*theme-(light|dark)\b/g, "");
    body.className += " theme-" + nextTheme;
    theme = nextTheme;
    var lightButton = document.getElementById("theme-light");
    var darkButton = document.getElementById("theme-dark");
    if (lightButton) lightButton.className = "appearance-choice" + (theme === "light" ? " selected" : "");
    if (darkButton) darkButton.className = "appearance-choice" + (theme === "dark" ? " selected" : "");
    try { window.localStorage.setItem("doodland-tv-theme", theme); } catch (ignore) {}
  }
  var lightButton = document.getElementById("theme-light");
  var darkButton = document.getElementById("theme-dark");
  if (lightButton) lightButton.onclick = function () { applyTheme("light"); };
  if (darkButton) darkButton.onclick = function () { applyTheme("dark"); };
  applyTheme(theme);

  var title = document.getElementById("program-title");
  var video = document.getElementById("live-video");
  var status = document.getElementById("player-status");
  var STREAM_URL = "https://lexi.taild40b43.ts.net/legacy/live.m3u8";
  var XMLTV_URL = "https://lexi.taild40b43.ts.net/iptv/xmltv.xml";

  function setStatus(message) {
    if (status) status.innerHTML = message;
  }

  // Use Safari's built-in HLS player. No MSE, fetch(), promises, or modern JS syntax.
  if (video) {
    video.addEventListener("playing", function () { setStatus("Playing live"); }, false);
    video.addEventListener("waiting", function () { setStatus("Buffering..."); }, false);
    video.addEventListener("pause", function () { setStatus("Paused"); }, false);
    video.addEventListener("error", function () {
      var code = video.error ? video.error.code : 0;
      if (code === 2) setStatus("Network error: check the stream connection");
      else if (code === 3 || code === 4) setStatus("Safari rejected the stream format or connection");
      else setStatus("Stream error. Try opening the stream directly");
    }, false);
    // Assign the absolute URL in JS as well, to avoid broken /api paths on static hosting.
    if (!video.getAttribute("src")) video.setAttribute("src", STREAM_URL);
  }

  function xmlTime(value) {
    var m = /^([0-9]{4})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})(?:\s*([+-])([0-9]{2})([0-9]{2}))?/.exec(value || "");
    if (!m) return NaN;
    var t = Date.UTC(parseInt(m[1],10), parseInt(m[2],10)-1, parseInt(m[3],10), parseInt(m[4],10), parseInt(m[5],10), parseInt(m[6],10));
    if (m[7]) {
      var offset = (parseInt(m[8],10)*60 + parseInt(m[9],10)) * 60000;
      t -= (m[7] === "+" ? offset : -offset);
    }
    return t;
  }

  function textOf(parent, tag) {
    var nodes = parent.getElementsByTagName(tag);
    if (!nodes || !nodes.length) return "";
    return nodes[0].textContent || nodes[0].text || "";
  }

  function findProgram(xml) {
    var channels = xml.getElementsByTagName("channel");
    var channelId = "";
    var i, id, name;
    for (i = 0; i < channels.length; i++) {
      id = channels[i].getAttribute("id") || "";
      name = textOf(channels[i], "display-name");
      if (/doodland/i.test(id + " " + name)) { channelId = id; break; }
      if (!channelId && /(^|[^a-z0-9])(channel)?1($|[^a-z0-9])/i.test(id)) channelId = id;
    }
    if (!channelId) return "Guide loaded, but Doodland TV channel was not found";
    var programs = xml.getElementsByTagName("programme");
    var now = new Date().getTime();
    for (i = 0; i < programs.length; i++) {
      var p = programs[i];
      if ((p.getAttribute("channel") || "") !== channelId) continue;
      if (xmlTime(p.getAttribute("start")) <= now && now < xmlTime(p.getAttribute("stop"))) {
        return textOf(p, "title") || "Untitled program";
      }
    }
    return "No program currently listed";
  }

  function loadProgram() {
    if (!title) return;
    var request = new XMLHttpRequest();
    try { request.open("GET", XMLTV_URL + "?legacy=" + new Date().getTime(), true); }
    catch (openError) { title.innerHTML = "Guide unavailable"; return; }
    request.onreadystatechange = function () {
      if (request.readyState !== 4) return;
      if (request.status !== 200) { title.innerHTML = "Guide unavailable"; return; }
      try {
        var xml = request.responseXML;
        if (!xml && window.DOMParser) xml = (new DOMParser()).parseFromString(request.responseText, "text/xml");
        if (!xml || xml.getElementsByTagName("parsererror").length) { title.innerHTML = "Guide unavailable"; return; }
        title.innerHTML = escapeText(findProgram(xml));
      } catch (e) { title.innerHTML = "Guide unavailable"; }
    };
    request.onerror = function () { title.innerHTML = "Guide unavailable"; };
    try { request.send(null); } catch (sendError) { title.innerHTML = "Guide unavailable"; }
  }

  function escapeText(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // iOS 7/8 Safari can mis-measure the video frame during the initial orientation.
  // Recalculate layout only; do not reload the media element (which can crash old Safari).
  function refreshLegacyLayout() {
    var frame = document.querySelector ? document.querySelector(".tv-ratio") : null;
    if (frame) {
      frame.style.display = "none";
      frame.offsetHeight;
      frame.style.display = "";
    }
  }
  if (window.addEventListener) {
    window.addEventListener("orientationchange", function () { window.setTimeout(refreshLegacyLayout, 150); }, false);
    window.addEventListener("resize", refreshLegacyLayout, false);
  }
  loadProgram();
  window.setInterval(loadProgram, 60000);
}());
