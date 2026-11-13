import "server-only";
import { isIP } from "node:net";

// A light "verification" for proof-of-work links: the link must be a public http(s) URL
// that answers. It proves the page exists, not that the person built it. Good enough for a
// prototype; see "What to improve next" in the README.

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i;
const PRIVATE_V4 = [/^10\./, /^127\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^0\./];

function isPublicUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (PRIVATE_HOST.test(host)) return null;
  if (isIP(host) === 6) return null;
  if (isIP(host) === 4 && PRIVATE_V4.some((r) => r.test(host))) return null;
  return u;
}

export async function checkProofUrl(raw: string): Promise<boolean> {
  const u = isPublicUrl(raw);
  if (!u) return false;
  try {
    const res = await fetch(u, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
      headers: { "user-agent": "ComplementLinkCheck/0.1" },
    });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}
