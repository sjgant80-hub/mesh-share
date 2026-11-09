// worker.mjs — off the page's thread: 'rerun' re-reads H with B's two shapes (src/eval.mjs, the record's hash), and
// re-runs the whole trade in the tab: A's seeded key signs A's shape again, and every share is checked in the sealed
// order with this browser's own WebCrypto Ed25519.
import M from './vendor/hybrid-gate/src/mnist.mjs';
import X from './src/exchange.mjs';
import E from './src/eval.mjs';

const get = async (p, gz) => { const r = await fetch(new URL(p, import.meta.url)); if (!r.ok) throw new Error(p + ' answered ' + r.status); return gz ? new Uint8Array(await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()) : r.text(); };
let F = null;
async function load() {
  if (F) return F;
  const [img, lab, timg, tlab, aText, bText, afterText, s0Text, xj] = await Promise.all([get('./data/mnist/train-images-idx3-ubyte.gz', 1), get('./data/mnist/train-labels-idx1-ubyte.gz', 1), get('./data/mnist/t10k-images-idx3-ubyte.gz', 1), get('./data/mnist/t10k-labels-idx1-ubyte.gz', 1),
    get('./data/cell-A.txt'), get('./data/cell-B.txt'), get('./data/cell-after.txt'), get('./vendor/code-rsi/vendor/settling-cell/data/cell.txt'), get('./data/exchange.json')]);
  const train = M.parse(img, lab);
  F = { poolB: { x: train.x.slice(30000), y: train.y.slice(30000) }, H: M.parse(timg, tlab), aText, bText, afterText, s0Text, exchange: JSON.parse(xj) };
  return F;
}
self.onmessage = async (m) => {
  const q = m.data || {};
  try {
    const f = await load();
    if (q.do === 'trade') {
      const t0 = performance.now(), t = await X.trade({ aText: f.aText, bText: f.bText, s0Text: f.s0Text, poolB: f.poolB });
      self.postMessage({ id: q.id, ok: true, trade: { ...t, after: t.after === f.afterText }, ms: Math.round(performance.now() - t0) });
      return;
    }
    if (q.do === 'rerun') {
      const t0 = performance.now(), record = E.evaluate({ H: f.H, bText: f.bText, afterText: f.afterText, exchange: f.exchange });
      self.postMessage({ id: q.id, ok: !!record, record, ms: Math.round(performance.now() - t0), why: record ? '' : 'the record did not compute' });
      return;
    }
    self.postMessage({ id: q.id, ok: false, why: 'unknown request' });
  } catch (e) { self.postMessage({ id: q.id, ok: false, why: String((e && e.message) || e).slice(0, 200) }); }
};
