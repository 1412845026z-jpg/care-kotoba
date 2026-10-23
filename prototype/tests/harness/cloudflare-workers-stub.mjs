// Unit-test stand-in for the Workers runtime module; values come from process.env.
export const env = new Proxy({}, { get: (_, k) => (typeof k === "string" ? process.env[k] : undefined) });
