// CI review only. Inherited by Node test subprocesses via NODE_OPTIONS.
// Harness requests and simulated AI are loopback HTTP; no live provider is used.
const originalFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input, init) => {
  const value = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(value);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
    throw new Error(`CI review blocks non-loopback fetch: ${url.hostname}`);
  }
  return originalFetch(input, init);
};
