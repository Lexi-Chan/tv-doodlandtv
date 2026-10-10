const STREAM_ORIGIN = "https://eeeeeeee.taild40b43.ts.net";
const XMLTV_URL = STREAM_ORIGIN + "/iptv/xmltv.xml";
const STREAM_HOST = new URL(STREAM_ORIGIN).hostname;
let nowPlayingCache = null;
let nowPlayingCacheUntil = 0;

function xmlText(block, tag) {
  const match = block.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i"));
  if (!match) return "";
  return match[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '\"')
    .replace(/&apos;/g, "'").replace(/&#x([0-9a-f]+);/gi, (_m, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(parseInt(code, 10))).replace(/&amp;/g, "&").trim();
}

function xmltvTime(value) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-])(\d{2})(\d{2}))?/);
  if (!match) return NaN;
  const local = Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6]);
  const offset = match[7] ? (match[8] * 60 + +match[9]) * (match[7] === "+" ? 1 : -1) : 0;
  return local - offset * 60000;
}

function xmlAttribute(attributes, name) {
  const match = attributes.match(new RegExp("\\b" + name + "\\s*=\\s*([\"'])(.*?)\\1", "i"));
  return match ? match[2] : "";
}

function currentProgram(xml, now) {
  let targetId = "";
  let channelId = "";
  const channels = /<channel\b([^>]*)>([\s\S]*?)<\/channel>/gi;
  let match;
  while ((match = channels.exec(xml))) {
    const id = xmlAttribute(match[1], "id");
    const name = xmlText(match[2], "display-name");
    if (/doodland/i.test(id + " " + name)) {
      targetId = id;
      break;
    }
    if (!channelId && /(?:^|[^a-z0-9])(?:channel)?1(?:$|[^a-z0-9])/i.test(id)) channelId = id;
  }
  if (!targetId) targetId = channelId;
  if (!targetId) return null;

  const programs = /<programme\b([^>]*)>([\s\S]*?)<\/programme>/gi;
  while ((match = programs.exec(xml))) {
    const attrs = match[1];
    if (xmlAttribute(attrs, "channel") !== targetId) continue;
    const start = xmltvTime(xmlAttribute(attrs, "start"));
    const stop = xmltvTime(xmlAttribute(attrs, "stop"));
    if (start <= now && now < stop) return { title: xmlText(match[2], "title") || "Untitled program" };
  }
  return { title: "No program currently listed" };
}

function isAllowedStreamPath(path) {
  return path === "/iptv/channel/1.m3u8" || /^\/iptv\/session\/\d+\/(?:live(?:_sub)?\.m3u8|live\d+\.ts)$/.test(path);
}

function proxyUri(value, manifestUrl) {
  const remote = new URL(value, manifestUrl);
  if (remote.hostname === STREAM_HOST || remote.hostname === "127.0.0.1" || remote.hostname === "localhost") {
    return "/api/stream" + remote.pathname + remote.search;
  }
  return value;
}

function rewriteManifest(text, manifestUrl) {
  return text.split(/\r?\n/).filter(line => !/^#EXT-X-MEDIA:/i.test(line) && line !== "#EXT-X-INDEPENDENT-SEGMENTS").map(line => {
    if (/^#EXT-X-VERSION:/i.test(line)) return "#EXT-X-VERSION:3";
    if (/^#EXT-X-STREAM-INF:/i.test(line)) return line.replace(/,?(?:AUDIO|SUBTITLES|CLOSED-CAPTIONS)="[^"]*"/g, "");
    if (line.charAt(0) === "#") return line.replace(/URI="([^"]+)"/g, (_match, uri) => "URI=\"" + proxyUri(uri, manifestUrl) + "\"");
    if (line.trim()) return proxyUri(line.trim(), manifestUrl);
    return line;
  }).join("\n");
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/now-playing" && request.method === "GET") {
      const now = Date.now();
      const headers = { "cache-control": "public, max-age=30" };
      if (nowPlayingCache && now < nowPlayingCacheUntil) return Response.json(nowPlayingCache, { headers: headers });

      try {
        const upstream = await fetch(XMLTV_URL, { headers: { accept: "application/xml, text/xml" } });
        if (!upstream.ok) return Response.json({ title: "Schedule unavailable" }, { status: 502, headers: { "cache-control": "no-store" } });
        const program = currentProgram(await upstream.text(), now);
        if (!program) return Response.json({ title: "Schedule unavailable" }, { status: 502, headers: { "cache-control": "no-store" } });
        nowPlayingCache = program;
        nowPlayingCacheUntil = now + 30000;
        return Response.json(program, { headers: headers });
      } catch (error) {
        return Response.json({ title: "Schedule unavailable" }, { status: 502, headers: { "cache-control": "no-store" } });
      }
    }

    if (url.pathname.indexOf("/api/stream/") === 0 && request.method === "GET") {
      const streamPath = url.pathname.slice("/api/stream".length);
      if (!isAllowedStreamPath(streamPath)) return new Response("Not found", { status: 404 });

      const upstreamUrl = new URL(streamPath + url.search, STREAM_ORIGIN);
      const headers = {};
      const range = request.headers.get("range");
      if (range) headers.range = range;
      const upstream = await fetch(upstreamUrl.href, { headers: headers });
      if (!upstream.ok) return new Response("The live stream is temporarily unavailable.", { status: upstream.status });

      if (/\.m3u8$/i.test(streamPath)) {
        const manifest = rewriteManifest(await upstream.text(), upstreamUrl.href);
        return new Response(manifest, {
          headers: {
            "content-type": "application/vnd.apple.mpegurl; charset=utf-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*"
          }
        });
      }

      const mediaHeaders = new Headers({
        "content-type": upstream.headers.get("content-type") || "video/mp2t",
        "cache-control": "no-store",
        "accept-ranges": upstream.headers.get("accept-ranges") || "bytes"
      });
      ["content-length", "content-range", "etag", "last-modified"].forEach(name => {
        const value = upstream.headers.get(name);
        if (value) mediaHeaders.set(name, value);
      });
      return new Response(upstream.body, { status: upstream.status, headers: mediaHeaders });
    }

    return new Response("Not found", { status: 404 });
  }
};
