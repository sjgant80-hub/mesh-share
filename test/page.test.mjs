// The page and the files, held to their sealed claims: M6 (no measured number typed into the page), M7 (the data and
// every vendored file are the pinned bytes), seal 2 naming what H was read with, the credits, and the failures told.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const sha = (p) => createHash('sha256').update(readFileSync(new URL(p, ROOT))).digest('hex');
const html = read('index.html'), app = read('app.mjs'), claims = read('CLAIMS.md');

test('M7: the MNIST files and every vendored file are the pinned bytes', () => {
  const rung3 = read('vendor/hybrid-gate/src/mnist.mjs');
  assert.ok(rung3.length > 0);
  for (const p of ['vendor/code-rsi/vendor/settling-cell/src/cell.mjs', 'vendor/code-rsi/vendor/settling-cell/data/cell.txt', 'vendor/code-rsi/src/loop.mjs', 'vendor/hybrid-gate/src/mnist.mjs', 'vendor/living-seed/vendor/keys/keys.mjs', 'vendor/living-seed/vendor/keys/canon.mjs'])
    assert.ok(claims.includes(sha(p)), p + ' is the file seal 1 pinned');
  const pinned = new Map();
  for (const s of JSON.parse(read('vendor/SOURCES.json')).sources) for (const f of s.files) pinned.set(f.path, f.sha256);
  const files = [];
  (function walk(d) { for (const n of readdirSync(new URL(d, ROOT))) { const p = d + '/' + n; if (statSync(new URL(p, ROOT)).isDirectory()) walk(p); else files.push(p); } })('vendor');
  for (const f of files.filter((x) => x !== 'vendor/SOURCES.json')) { assert.ok(pinned.has(f), f + ' is not pinned'); assert.equal(sha(f), pinned.get(f), f + ' changed'); }
  const mn = { 't10k-images-idx3-ubyte.gz': '8d422c7b0a1c1c79245a5bcf07fe86e33eeafee792b84584aec276f5a2dbc4e6', 'train-images-idx3-ubyte.gz': '440fcabf73cc546fa21475e81ea370265605f56be210a4024d2ca8f203523609' };
  for (const [f, h] of Object.entries(mn)) assert.equal(sha('data/mnist/' + f), h);
});

test('seal 2 names B\'s two shapes and the exchange, and the record uses them', () => {
  const seal = read('SEAL2.md'), r = JSON.parse(read('data/record.json')).record, x = JSON.parse(read('data/exchange.json'));
  for (const f of ['data/cell-B.txt', 'data/cell-after.txt', 'data/exchange.json']) assert.ok(seal.includes(sha(f)), f);
  assert.equal(r.exchange, x.hash);
});

test('M6: no measured number is typed into the page', () => {
  const r = JSON.parse(read('data/record.json')).record, x = JSON.parse(read('data/exchange.json')), forms = new Set();
  for (const v of [r.alone.clean, r.alone.n25, r.after.clean, r.after.n25]) { forms.add(String(v)); forms.add((v * 100).toFixed(1) + '%'); }
  for (const v of Object.values(r.lows)) forms.add(Math.abs(v * 100).toFixed(2) + ' points');
  for (const n of [x.honest.wins, x.honest.losses, x.runA.accepted, x.runB.accepted, ...x.forgeries.map((f) => f.losses).filter((n) => n > 9)]) forms.add(n + ' wins'), forms.add(n + ' losses'), forms.add(' ' + n + ' changes');
  forms.add(x.hash.slice(0, 12)); forms.add(r.hash.slice(0, 12)); forms.add(x.pubA.slice(0, 12)); forms.add(x.honest.sig.slice(0, 12));
  const visible = html.replace(/<style>[\s\S]*?<\/style>/, '');
  for (const s of forms) assert.equal(visible.includes(s), false, 'the page has "' + s + '" typed in; it must come from the record');
  assert.match(app, /pct\(r\.after\.clean\)/);
});

test('the failures are told, the page explains itself, talks only to itself, and carries its credits', () => {
  assert.match(app, /pass \? 'HELD' : 'FAILED'/);
  assert.match(app, /Failed and kept: /);
  assert.match(html, /A claim that misses its bar is kept and shown as failed\./);
  for (const id of ['result', 'exchange', 'rerun', 'what', 'start', 'how', 'blueprint', 'adoption', 'paper', 'business']) assert.match(html, new RegExp('<section id="' + id + '"'), id);
  assert.match(html, /connect-src 'self'/);
  assert.match(html, /the MNIST database of handwritten digits, Y\. LeCun, C\. Cortes and C\. J\. C\. Burges, CC BY-SA 3\.0/);
  assert.match(html, /Powered by the Konomi architecture, created by Thomas Frumkin/);
  assert.equal(/£\s?\d|\$\s?\d|per seat|\/mo\b/i.test(html), false, 'no price of ours on the page');
});
