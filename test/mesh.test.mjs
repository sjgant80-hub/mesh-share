// The exchange and the H evaluator, held to the sealed text. Fixtures come from the MNIST TRAINING file only; H (the test
// digits) is read once, by tools/eval.mjs, after seal 2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import X from '../src/exchange.mjs';
import E from '../src/eval.mjs';
import L from '../vendor/code-rsi/src/loop.mjs';
import C from '../vendor/code-rsi/vendor/settling-cell/src/cell.mjs';
import M from '../vendor/hybrid-gate/src/mnist.mjs';
import * as K from '../vendor/living-seed/vendor/keys/keys.mjs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const claims = read('CLAIMS.md').replace(/\s+/g, ' ');
const raw = (f) => new Uint8Array(gunzipSync(readFileSync(new URL('../data/mnist/' + f, import.meta.url))));
const IMG = raw('train-images-idx3-ubyte.gz'), LAB = raw('train-labels-idx1-ubyte.gz');
const sub = (from, n) => {
  const i = new Uint8Array(16 + n * 784); i.set(IMG.subarray(0, 16)); new DataView(i.buffer).setUint32(4, n); i.set(IMG.subarray(16 + from * 784, 16 + (from + n) * 784), 16);
  const l = new Uint8Array(8 + n); l.set(LAB.subarray(0, 8)); new DataView(l.buffer).setUint32(4, n); l.set(LAB.subarray(8 + from, 8 + from + n), 8);
  return M.parse(i, l);
};
const s0 = read('vendor/code-rsi/vendor/settling-cell/data/cell.txt');
const g = sub(0, 2000), poolB = sub(2000, 1000), H = sub(5000, 300);
const aText = C.cellText(C.grow(g.x, g.y, { b: 4, k: 5 }), 64, 6);
const cfg = { ...X.CFG, exam: 60 };

test('the sealed numbers in the code are the ones CLAIMS.md states', () => {
  for (const s of ['for 600 cycles', 'for 60 cycles', 'fresh B exam of 200 items', 'noise seed 900,000 + the item', '(wins − losses) ≥ 2', 'SHA-256("mesh-share/node-A")', 'SHA-256("mesh-share/node-C")', '(16 of 64, seed 2026 + the test row)', '2,000 paired resamples, seed 99'])
    assert.ok(claims.includes(s), 'CLAIMS.md says: ' + s);
  assert.deepEqual(X.CFG, { cyclesA: 600, cyclesB: 60, exam: 200, gate: 2, examSeed: 901, noiseBase: 900000 });
  assert.deepEqual(X.KINDS, ['F1', 'F2', 'F3', 'F4', 'F5', 'F6']);
  assert.deepEqual(X.REASONS, ['adopted', 'unknown-key', 'bad-signature', 'not-a-cell', 'did-not-win']);
  assert.deepEqual(E.NOISE, { pixels: 16, seed: 2026 });
  for (const o of [X.CFG, X.KINDS, X.REASONS, E.NOISE]) assert.ok(Object.isFrozen(o));
});

test('keys and shares: seeded identities, signatures over exactly the bytes', async () => {
  const A = await X.keyOf('node-A'), A2 = await X.keyOf('node-A'), Cn = await X.keyOf('node-C');
  assert.equal(A.pub, 'c891c96b24d7030859e475e65d37302dcb818a15db462d1df7a71aca4315b33a');
  assert.equal(Cn.pub, '017c001bed77dbc6b4e5dc53492e4c37cafe86d804eb220372f5a651b630c2cf');
  assert.equal(A2.pub, A.pub);
  const s = await X.share(A, 'hello');
  assert.deepEqual(Array.from(s.bytes), Array.from(new TextEncoder().encode('hello')));
  assert.equal(s.pub, A.pub);
  assert.equal(await K.verify(A.pub, s.sig, s.bytes), true);
  assert.equal((await X.share(A, 'hello')).sig, s.sig, 'Ed25519 is deterministic: the same bytes, the same signature');
});

test('examOf: B\'s k-th fresh exam, noise seeded 900,000 + its position', () => {
  const e0 = X.examOf(poolB, 0, 4, cfg), e2 = X.examOf(poolB, 2, 4, cfg);
  assert.equal(e0.length, 60);
  assert.deepEqual(e2.map((x) => x.i), Array.from({ length: 60 }, (_, q) => 120 + q));
  const rows = L.examRows(poolB.x.length, 180, 901);
  assert.deepEqual(e2[5].bits, C.encode(C.noisy(poolB.x[rows[125]], 6, 900125), 4));
  assert.equal(e2[5].y, poolB.y[rows[125]]);
  assert.equal(X.examOf(poolB, 0, 4).length, 200, 'the sealed exam is 200 items');
});

test('forge: the five forgeries are exactly what the seal names', () => {
  const honest = { bytes: new Uint8Array(200).map((_, i) => i), sig: 'aa', pub: 'pp' };
  const o = { cSigned: { tag: 'c' }, otherSig: 'bb', junk: { tag: 'j' }, s0: { tag: 's' } };
  const f1 = X.forge(honest, 'F1', o);
  assert.equal(f1.bytes[100], 101); assert.equal(f1.bytes[99], 99); assert.equal(f1.bytes[101], 101); assert.equal(f1.sig, 'aa'); assert.equal(honest.bytes[100], 100, 'the honest share is not changed');
  assert.equal(X.forge(honest, 'F2', o), o.cSigned);
  assert.deepEqual(X.forge(honest, 'F3', o), { bytes: honest.bytes, sig: 'bb', pub: 'pp' });
  const f4 = X.forge(honest, 'F4', o);
  assert.equal(f4.bytes.length, 150); assert.equal(f4.sig, 'aa'); assert.equal(f4.pub, 'pp');
  assert.equal(X.forge(honest, 'F5', o), o.junk);
  assert.equal(X.forge(honest, 'F6', o), o.s0);
});

test('receive and trade: the sealed order, every reason, B unchanged by every refusal', async () => {
  const t = await X.trade({ aText, bText: s0, s0Text: s0, poolB }, cfg);
  assert.equal(t.after, aText, 'the honest share won B\'s exam and was adopted');
  assert.deepEqual(t.honest, { adopted: true, reason: 'adopted', wins: 16, losses: 9, sig: 'ef62b5881d7b89f67013e38611c6605308f045ac3e13757adfc106f7e5b8bcea85b6110e3cfe6a2e14d28943f3c8e800f7f9365ff7c49105fd6d95fe9d32ca0d' });
  assert.deepEqual(t.forgeries.map((f) => f.reason), ['bad-signature', 'unknown-key', 'bad-signature', 'bad-signature', 'not-a-cell', 'did-not-win']);
  assert.ok(t.forgeries.every((f) => !f.adopted && f.unchanged));
  assert.deepEqual([t.forgeries[5].wins, t.forgeries[5].losses], [2, 24]);
  const A = await X.keyOf('node-A'), roster = [A.pub];
  const close = await X.share(A, aText);
  const r1 = await X.receive(aText, close, roster, poolB, 3, cfg);
  assert.deepEqual([r1.adopted, r1.reason, r1.wins, r1.losses], [false, 'did-not-win', 0, 0], 'the same shape cannot win: wins − losses = 0');
  const near = await X.receive(s0, close, roster, poolB, 0, { ...cfg, gate: 7 });
  assert.equal(near.reason, 'adopted', '16 − 9 = 7 clears a gate of 7');
  const not = await X.receive(s0, close, roster, poolB, 0, { ...cfg, gate: 8 });
  assert.deepEqual([not.reason, not.text], ['did-not-win', s0], '7 does not clear 8');
});

test('exchange: both runs and the trade, wired as sealed (a small fixture)', async () => {
  const r = await X.exchange({ poolA: sub(0, 600), poolB: sub(600, 600), s0Text: s0 }, { ...cfg, cyclesA: 3, cyclesB: 1 });
  assert.deepEqual([r.runA.cycles, r.runB.cycles], [3, 1]);
  assert.equal(r.runA.hash, L.runLoop(sub(0, 600), s0, { cycles: 3 }).hash);
  assert.equal(r.forgeries.length, 6);
  assert.match(r.hash, /^[0-9a-f]{64}$/);
  assert.equal((await X.exchange({ poolA: sub(0, 600), poolB: sub(600, 600), s0Text: s0 }, { ...cfg, cyclesA: 3, cyclesB: 1 })).hash, r.hash, 'deterministic');
});

test('the H evaluator, number for number on a training-file fixture, and its verdicts', () => {
  const r = E.evaluate({ H, bText: s0, afterText: aText, exchange: { hash: 'x' } });
  assert.deepEqual(r, { digits: 300, alone: { clean: 0.413333, n25: 0.28 }, after: { clean: 0.723333, n25: 0.533333 }, lows: { M1clean: 0.243333, M1n25: 0.19 }, exchange: 'x', hash: 'd220b1a18c2e1d904622a277bb63c6fdb1cecf2e689120c004e0eac0ed388312' });
  assert.equal(E.evaluate({ H, bText: 'nope', afterText: aText, exchange: { hash: 'x' } }), null);
  assert.equal(E.evaluate({ H, bText: s0, afterText: 'nope', exchange: { hash: 'x' } }), null);
  assert.equal(E.evaluate({ H: { x: [], y: [] }, bText: s0, afterText: aText, exchange: { hash: 'x' } }), null);
  assert.equal(E.evaluate({ H, bText: s0, afterText: aText, exchange: null }), null);
  const lines = []; const o = E.readH(L.cellOf(L.levelsShape(aText)), { x: H.x.slice(0, 3), y: H.y.slice(0, 3) }, 't', lines);
  assert.equal(lines.length, 6); assert.ok(lines[1].startsWith('t n25 0 ')); assert.equal(o.clean.length, 3);
  const x = { honest: { adopted: true, reason: 'adopted', wins: 5, losses: 3 }, forgeries: [['F1', 'bad-signature'], ['F2', 'unknown-key'], ['F3', 'bad-signature'], ['F4', 'bad-signature'], ['F5', 'not-a-cell'], ['F6', 'did-not-win']].map(([kind, reason]) => ({ kind, reason, adopted: false, unchanged: true, wins: 0, losses: 0 })) };
  const rec = { lows: { M1clean: 0.0001, M1n25: 0.0001 } };
  const pass = (rr, xx) => Object.fromEntries(E.verdicts(rr, xx).map((v) => [v.id, v.pass]));
  assert.deepEqual(pass(rec, x), { M1: true, M2: true, M3: true, M4: true });
  assert.deepEqual(pass({ lows: { M1clean: 0, M1n25: 0.0001 } }, x).M1, false);
  assert.deepEqual(pass({ lows: { M1clean: 0.0001, M1n25: 0 } }, x).M1, false);
  const bend = (k, o2) => ({ ...x, forgeries: x.forgeries.map((f) => (f.kind === k ? { ...f, ...o2 } : f)) });
  for (const k of ['F1', 'F3', 'F4']) assert.equal(pass(rec, bend(k, { reason: 'not-a-cell' })).M2, false, k + ' must fail at the signature');
  assert.equal(pass(rec, bend('F2', { reason: 'bad-signature' })).M2, false);
  assert.equal(pass(rec, bend('F5', { reason: 'bad-signature' })).M2, false);
  assert.equal(pass(rec, bend('F2', { unchanged: false })).M2, false);
  assert.equal(pass(rec, bend('F4', { adopted: true })).M2, false);
  assert.equal(pass(rec, bend('F6', { reason: 'adopted' })).M3, false);
  assert.equal(pass(rec, bend('F6', { adopted: true })).M3, false);
  assert.equal(pass(rec, bend('F6', { unchanged: false })).M3, false);
  assert.equal(pass(rec, { ...x, honest: { adopted: true, reason: 'adopted', wins: 4, losses: 3 } }).M4, false, 'wins − losses = 1 is under 2');
  assert.equal(pass(rec, { ...x, honest: { adopted: false, reason: 'did-not-win', wins: 9, losses: 0 } }).M4, false);
  const v = E.verdicts(rec, x);
  assert.deepEqual(v.map((y) => y.bar), ['above 0 and above 0', 'every one', 'did-not-win', 'adopted with wins − losses ≥ 2']);
  assert.deepEqual(v[1].measured, ['F1 bad-signature', 'F2 unknown-key', 'F3 bad-signature', 'F4 bad-signature', 'F5 not-a-cell']);
  assert.equal(v[2].measured, 'did-not-win (0 wins, 0 losses)');
  assert.equal(v[3].measured, 'adopted (5 wins, 3 losses)');
});
