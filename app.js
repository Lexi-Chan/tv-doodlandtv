(function () {
  var title = document.getElementById("program-title");
  var video = document.getElementById("live-video");
  var status = document.getElementById("player-status");
  var STREAM_URL = "https://eeeeeeee.taild40b43.ts.net/iptv/channel/1.ts";
  var XMLTV_URL = "https://eeeeeeee.taild40b43.ts.net/iptv/xmltv.xml";

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
    request.open("GET", XMLTV_URL + "?legacy=" + new Date().getTime(), true);
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
    request.send(null);
  }

  function escapeText(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  }

  loadProgram();
  window.setInterval(loadProgram, 60000);
}());
