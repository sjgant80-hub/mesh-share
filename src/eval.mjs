// src/eval.mjs — H, read once after seal 2: B alone (its own 60-cycle shape) against B after the exchange, on every test
// digit, clean and with 25% of the pixels replaced, and every claim judged against the bar CLAIMS.md fixed first.
// Pure and browser-safe: the page's worker runs this same code and must reproduce the hash.
import C from '../vendor/code-rsi/vendor/settling-cell/src/cell.mjs';
import L from '../vendor/code-rsi/src/loop.mjs';
import { sha256Hex } from '../vendor/code-rsi/vendor/settling-cell/vendor/seed-library/sha256.mjs';
import { round6 } from '../vendor/code-rsi/vendor/settling-cell/vendor/seed-library/seedlib.mjs';

export const NOISE = Object.freeze({ pixels: 16, seed: 2026 });
const share = (v) => round6(v.reduce((s, a) => s + a, 0) / v.length);

/** readH(c, H, tag, lines) → per test digit: settled right, clean and at 25% noise (seed 2026 + the test row). */
export function readH(c, H, tag, lines) {
  const clean = [], n25 = [];
  for (let i = 0; i !== H.x.length; i++) {
    for (const [k, px, out] of [['clean', H.x[i], clean], ['n25', C.noisy(H.x[i], NOISE.pixels, NOISE.seed + i), n25]]) {
      const st = C.settle(c, C.encode(px, 4));
      out.push(st.answer === H.y[i] ? 1 : 0);
      lines.push(tag + ' ' + k + ' ' + i + ' ' + st.answer + ' ' + st.fit);
    }
  }
  return { clean, n25 };
}
/** evaluate({ H, bText, afterText, exchange }) → the H record. */
export function evaluate({ H, bText, afterText, exchange }) {
  const sb = L.levelsShape(bText), sa = L.levelsShape(afterText), cb = sb && L.cellOf(sb), ca = sa && L.cellOf(sa);
  if (!cb || !ca || !H.x.length || !exchange) return null;
  const lines = [], alone = readH(cb, H, 'alone', lines), after = readH(ca, H, 'after', lines);
  const low = (a, b) => round6(C.pairedLow(a, b, 2000, 99));
  return {
    digits: H.x.length, alone: { clean: share(alone.clean), n25: share(alone.n25) }, after: { clean: share(after.clean), n25: share(after.n25) },
    lows: { M1clean: low(after.clean, alone.clean), M1n25: low(after.n25, alone.n25) }, exchange: exchange.hash, hash: sha256Hex(lines.join('\n') + '\n'),
  };
}
/** verdicts(r, x) → each sealed claim beside its bar; x is the exchange record. */
export function verdicts(r, x) {
  const f = Object.fromEntries(x.forgeries.map((g) => [g.kind, g]));
  const atSig = ['F1', 'F3', 'F4'].every((k) => f[k].reason === 'bad-signature') && f.F2.reason === 'unknown-key' && f.F5.reason === 'not-a-cell';
  return [
    { id: 'M1', what: 'B after the exchange against B alone on H: lower bound clean, and at 25% noise', measured: [r.lows.M1clean, r.lows.M1n25], bar: 'above 0 and above 0', pass: r.lows.M1clean > 0 && r.lows.M1n25 > 0 },
    { id: 'M2', what: 'forgeries refused before parsing (F1-F4 at the key or signature, F5 at the parse), none changing B', measured: x.forgeries.slice(0, 5).map((g) => g.kind + ' ' + g.reason), bar: 'every one', pass: atSig && x.forgeries.slice(0, 5).every((g) => !g.adopted && g.unchanged) },
    { id: 'M3', what: 'the honest-but-bad share (F6, validly signed) refused by B\'s own exam', measured: f.F6.reason + ' (' + f.F6.wins + ' wins, ' + f.F6.losses + ' losses)', bar: 'did-not-win', pass: f.F6.reason === 'did-not-win' && !f.F6.adopted && f.F6.unchanged },
    { id: 'M4', what: 'the honest share adopted only after clearing B\'s gate on B\'s own exam', measured: x.honest.reason + ' (' + x.honest.wins + ' wins, ' + x.honest.losses + ' losses)', bar: 'adopted with wins − losses ≥ 2', pass: x.honest.adopted && x.honest.wins - x.honest.losses >= 2 },
  ];
}
export default { NOISE, readH, evaluate, verdicts };
