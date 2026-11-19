// Module worker for the Kotlin/Wasm labs (5-7): their searches and training loops
// can run for seconds, so they run here instead of on the page's main thread.
// Protocol: { id, name, args } in, { id, result } or { id, error } out.
const labs = import('./kotlin-wasm/labs.mjs');

self.onmessage = async ({ data: { id, name, args } }) => {
  try {
    const k = await labs;
    self.postMessage({ id, result: k[name](...args) });
  } catch (e) {
    self.postMessage({ id, error: String(e?.message || e) });
  }
};
