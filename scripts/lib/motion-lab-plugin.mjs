import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
// Dev-only bootstrap. No route, credentials or plugin code enters the build.
export function motionLabPlugin() {
  const file = process.env.COWCOMING_LAB_SESSION;
  return {
    name: "cowcoming-local-motion-lab",
    apply: "serve",
    configureServer(server) {
      if (!file) return;
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split("?")[0] !== "/__motion-lab/start") return next();
        const expected = `127.0.0.1:${server.config.server.port}`;
        if (
          req.method !== "GET" ||
          req.headers.host !== expected ||
          (req.headers.origin && req.headers.origin !== `http://${expected}`) ||
          (req.headers["sec-fetch-site"] &&
            !["none", "same-origin"].includes(req.headers["sec-fetch-site"]))
        ) {
          res.writeHead(403);
          res.end("Local navigation required");
          return;
        }
        try {
          const session = JSON.parse(await readFile(file, "utf8"));
          const data = JSON.stringify({
            relay: session.relay,
            key: session.key,
          }).replaceAll("<", "\\u003c");
          const nonce = randomBytes(18).toString("base64");
          res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'`,
          });
          res.end(
            `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>牛来动作调试</title><p>正在连接本地模拟设备…</p><script nonce="${nonce}">try { sessionStorage.setItem('cowcoming-live', JSON.stringify(${data})); location.replace('/?section=work&motionLab=1'); } catch { document.querySelector('p').textContent='请允许此站点使用浏览器存储后重试。'; }</script></html>`,
          );
        } catch {
          res.writeHead(503);
          res.end("Motion lab is not ready");
        }
      });
    },
  };
}
