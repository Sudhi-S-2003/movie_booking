import { lookup } from 'node:dns/promises';
import net from 'node:net';

/**
 * Outbound fetch for user-supplied URLs (SSRF protection).
 *  - http/https only, default ports only
 *  - every hop's hostname is resolved and rejected if ANY address is
 *    private, loopback, link-local (incl. cloud metadata 169.254.169.254),
 *    CGNAT, multicast or reserved
 *  - redirects are followed manually (max 3) and re-validated
 *  - response body is capped and the whole request times out
 * Residual risk: DNS rebinding between our lookup and the socket connect.
 */
export class UnsafeUrlError extends Error {}

const MAX_REDIRECTS = 3;

const isPrivateV4 = (ip: string): boolean => {
  const [a = 0, b = 0] = ip.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224
  );
};

const isPrivateV6 = (ip: string): boolean => {
  const v = ip.toLowerCase();
  if (v === '::' || v === '::1') return true;
  if (v.startsWith('::ffff:')) return isPrivateV4(v.slice(7));
  return v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') ||
    v.startsWith('fea') || v.startsWith('feb') || v.startsWith('ff');
};

export const isPrivateAddress = (ip: string): boolean =>
  net.isIPv4(ip) ? isPrivateV4(ip) : net.isIPv6(ip) ? isPrivateV6(ip) : true;

export const assertPublicUrl = async (raw: string): Promise<URL> => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError('Invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new UnsafeUrlError('Only http(s) URLs are allowed');
  if (url.username || url.password) throw new UnsafeUrlError('Credentials in URLs are not allowed');
  if (url.port && url.port !== '80' && url.port !== '443') throw new UnsafeUrlError('Non-standard ports are not allowed');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) throw new UnsafeUrlError('Host not allowed');
  const addresses = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) throw new UnsafeUrlError('Host resolves to a private address');
  return url;
};

export interface SafeResponse {
  finalUrl: string;
  status: number;
  contentType: string;
  body: string;
}

/** Read at most `maxBytes` of the body as UTF-8. */
const readCapped = async (res: Response, maxBytes: number): Promise<string> => {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < maxBytes) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  return Buffer.concat(chunks).subarray(0, maxBytes).toString('utf8');
};

export const safeFetchText = async (
  raw: string,
  { maxBytes = 1024 * 1024, timeoutMs = 8000, headers = {} as Record<string, string> } = {},
): Promise<SafeResponse> => {
  const signal = AbortSignal.timeout(timeoutMs);
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, { redirect: 'manual', signal, headers });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      await res.body?.cancel().catch(() => undefined);
      if (!location) throw new UnsafeUrlError('Redirect without location');
      current = new URL(location, url).toString();
      continue;
    }
    const contentType = res.headers.get('content-type') ?? '';
    const body = contentType.includes('text/html') ? await readCapped(res, maxBytes) : '';
    if (!body) await res.body?.cancel().catch(() => undefined);
    return { finalUrl: url.toString(), status: res.status, contentType, body };
  }
  throw new UnsafeUrlError('Too many redirects');
};
