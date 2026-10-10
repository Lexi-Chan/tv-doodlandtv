(function () {
  var title = document.getElementById("program-title");
  var video = document.getElementById("live-video");
  var status = document.getElementById("player-status");

  function setStatus(message) {
    if (status) status.innerHTML = message;
  }

  // Native HLS is used. No MSE, MediaSource, fetch(), async functions,
  // arrow functions, autoplay, or external JavaScript libraries.
  if (video) {
    video.addEventListener("playing", function () { setStatus("Playing live"); }, false);
    video.addEventListener("waiting", function () { setStatus("Buffering…"); }, false);
    video.addEventListener("pause", function () { setStatus("Paused"); }, false);
    video.addEventListener("error", function () {
      setStatus("Stream unavailable");
    }, false);
  }

  function loadProgram() {
    if (!title) return;
    var request = new XMLHttpRequest();
    request.open("GET", "/api/now-playing", true);
    request.onreadystatechange = function () {
      if (request.readyState !== 4) return;
      if (request.status !== 200) {
        title.innerHTML = "Guide unavailable";
        return;
      }
      try {
        var program = JSON.parse(request.responseText);
        title.innerHTML = escapeText(program.title || "No program listed");
      } catch (error) {
        title.innerHTML = "Guide unavailable";
      }
    };
    request.onerror = function () { title.innerHTML = "Guide unavailable"; };
    request.send(null);
  }

  function escapeText(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  loadProgram();
  window.setInterval(loadProgram, 60000);
}());
