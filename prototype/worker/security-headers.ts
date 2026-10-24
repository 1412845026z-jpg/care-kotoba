// Per-request CSP. Vinext reads the trusted request header to nonce its SSR scripts.
// Keep this module independent of application code and platform configuration.
export function createSecurityPolicy(url: URL, development: boolean) {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const nonce = btoa(String.fromCharCode(...bytes));
  const websocket = new URL(url.origin);
  websocket.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${development ? " 'unsafe-eval'" : ''}`,
    "script-src-attr 'none'",
    // React style attributes and the existing Google Fonts stylesheet need these.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    `connect-src 'self' https://api.openai.com${development ? ' ' + websocket.origin : ''}`,
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
  return { nonce, csp };
}

export function securityRequest(request: Request, csp: string): Request {
  const headers = new Headers(request.headers);
  // Never trust a nonce/policy supplied by the caller.
  headers.delete('content-security-policy-report-only');
  headers.set('content-security-policy', csp);
  return new Request(request, { headers });
}

export function securityResponse(response: Response, request: Request, csp: string): Response {
  // A Workers WebSocket upgrade carries a webSocket handle; leave that transport intact.
  if (response.status === 101) return response;
  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', csp);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Permissions-Policy', 'microphone=(self), camera=(), geolocation=(), display-capture=()');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  if (new URL(request.url).protocol === 'https:') {
    headers.set('Strict-Transport-Security', 'max-age=15552000');
  }
  if (headers.get('content-type')?.includes('text/html')) {
    // A nonce belongs to exactly one document response, not a shared HTML cache entry.
    headers.set('Cache-Control', 'no-store');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
