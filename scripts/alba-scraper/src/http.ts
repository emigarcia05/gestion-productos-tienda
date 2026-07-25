/**
 * HTTP(S) con TLS permisivo y seguimiento de redirects.
 */
import https from "node:https";
import http from "node:http";
import { URL } from "node:url";
import { ALBA_CONFIG } from "./config";

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const MAX_REDIRECTS = 5;

export async function httpJson<T>(
  url: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const raw = await httpText(url, options);
  return JSON.parse(raw) as T;
}

export async function httpText(
  url: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    timeoutMs?: number;
  } = {},
): Promise<string> {
  return requestOnce(url, options, 0);
}

function requestOnce(
  url: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    timeoutMs?: number;
  },
  redirectCount: number,
): Promise<string> {
  const method = options.method ?? "GET";
  const timeoutMs = options.timeoutMs ?? ALBA_CONFIG.requestTimeoutMs;
  const body =
    options.body === undefined ? undefined : JSON.stringify(options.body);
  const parsed = new URL(url);
  const isHttps = parsed.protocol === "https:";
  const lib = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      url,
      {
        method,
        agent: isHttps ? httpsAgent : undefined,
        headers: {
          "User-Agent": ALBA_CONFIG.userAgent,
          Accept: "application/json, text/html, */*",
          "Accept-Language": "es-AR,es;q=0.9",
          ...(body
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
              }
            : {}),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;

        if (
          location &&
          status >= 300 &&
          status < 400 &&
          redirectCount < MAX_REDIRECTS
        ) {
          res.resume();
          const next = new URL(location, url).toString();
          // Tras redirect, los POST suelen convertirse en GET para 301/302.
          const nextOpts =
            status === 301 || status === 302
              ? { ...options, method: "GET" as const, body: undefined }
              : options;
          resolve(requestOnce(next, nextOpts, redirectCount + 1));
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if (status < 200 || status >= 300) {
            reject(
              new Error(`HTTP ${status} en ${url}: ${text.slice(0, 200)}`),
            );
            return;
          }
          resolve(text);
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout ${timeoutMs}ms en ${url}`));
    });
    if (body) req.write(body);
    req.end();
  });
}
