// app.mjs — the page's glue. Every number is read from the committed record, the exchange record or the gate receipts,
// or computed in this tab (claim M6: none is typed into index.html). The trade and the judgement re-run in worker.mjs.
import { mintCase, sourcesOf } from './vendor/liveware/mintcase.mjs';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(props)) if (k === 'class') e.className = v; else e.setAttribute(k, v); for (const c of kids) e.append(c); return e; };
const json = (p) => fetch(p).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const pct = (x) => (x * 100).toFixed(1) + '%';
const pts = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x * 100).toFixed(2) + ' points';
const big = (n) => Number(n).toLocaleString('en-GB');
const chip = (pass) => el('span', { class: 'chip ' + (pass ? 'win' : 'bad') }, pass ? 'HELD' : 'FAILED');
let REC = null, X = null, GATES = [], BASIS = null;
const PLAIN = { M1: 'Sharing helps: B after the exchange beats B alone, clean and noisy', M2: 'Forgeries are refused before parsing, and change nothing', M3: 'Trust the key, check the shape: a validly signed bad share is refused', M4: 'The honest share earned its place on B\'s own exam' };
const WHAT = { honest: 'A\'s shape, signed by A', F1: 'one byte of A\'s shape changed, A\'s original signature', F2: 'A\'s shape signed by C, who is not on B\'s roster', F3: 'A\'s shape with A\'s signature over different bytes', F4: 'A\'s shape cut short, A\'s signature', F5: 'bytes that are not a cell, validly signed by A', F6: 'Rung 1\'s weak cell, validly signed by A: honest but bad' };
const STOP = { adopted: 'cleared every check: adopted', 'unknown-key': 'the roster, before parsing', 'bad-signature': 'the signature on the raw bytes, before parsing', 'not-a-cell': 'the parse', 'did-not-win': 'B\'s own exam' };

function fill() {
  const r = REC.record, v = REC.verdicts, held = v.filter((x) => x.pass), failed = v.filter((x) => !x.pass);
  $('verdictline').textContent = held.length + ' of ' + v.length + ' measured claims held. On ' + big(r.digits) + ' test digits, B alone read ' + pct(r.alone.clean) + ' and B after the exchange ' + pct(r.after.clean) + ' (' + pct(r.alone.n25) + ' → ' + pct(r.after.n25) + ' with a quarter of the pixels replaced).' + (failed.length ? ' Failed and kept: ' + failed.map((x) => x.id).join(', ') + '.' : '');
  const tb = $('claims').querySelector('tbody'); tb.replaceChildren();
  const show = (x) => (x.id === 'M1' ? [pts(x.measured[0]) + ' clean; ' + pts(x.measured[1]) + ' at 25% noise (lower bounds)', '> 0 and > 0'] : x.id === 'M2' ? [x.measured.join(' · '), 'every one before parsing'] : [x.measured, x.bar]);
  for (const x of v) { const [m, bar] = show(x); tb.append(el('tr', {}, el('td', {}, el('b', {}, x.id)), el('td', {}, PLAIN[x.id]), el('td', {}, m), el('td', {}, bar), el('td', {}, chip(x.pass)))); }
  for (const [id, w, m] of [['M5', 'Deterministic: the exchange and the record hash the same, in CI and in your tab', X.hash.slice(0, 16) + '…'], ['M6', 'No measured number typed into this page', 'checked by test/page.test.mjs'], ['M7', 'The MNIST files and every vendored file are the pinned bytes', 'checked by test/page.test.mjs']])
    tb.append(el('tr', {}, el('td', {}, el('b', {}, id)), el('td', {}, w), el('td', {}, m), el('td', {}, '—'), el('td', {}, el('span', { class: 'chip win' }, 'CI'))));
  for (const g of GATES) tb.append(el('tr', {}, el('td', {}, el('b', {}, 'G')), el('td', {}, 'Mutation gate on ' + g.kernel), el('td', { class: 'num' }, g.killed + ' of ' + g.total + ' caught, ' + g.ignored + ' baselined'), el('td', {}, 'clean'), el('td', {}, chip(g.clean && g.ignored === 0))));
  $('before').replaceChildren(
    el('div', { class: 'card' }, el('div', { class: 'k' }, 'B alone'), el('div', { class: 'big' }, pct(r.alone.clean)), el('div', { class: 'vs' }, 'clean · ' + pct(r.alone.n25) + ' at 25% noise · its own ' + big(X.runB.cycles) + '-cycle run kept ' + big(X.runB.accepted) + ' changes')),
    el('div', { class: 'card' }, el('div', { class: 'k' }, 'B after the exchange'), el('div', { class: 'big' }, pct(r.after.clean)), el('div', { class: 'vs' }, 'clean · ' + pct(r.after.n25) + ' at 25% noise · A\'s ' + big(X.runA.cycles) + '-cycle run kept ' + big(X.runA.accepted) + ' changes')),
    el('div', { class: 'card' }, el('div', { class: 'k' }, 'B\'s own exam of the honest share'), el('div', { class: 'big' }, big(X.honest.wins) + ' vs ' + big(X.honest.losses)), el('div', { class: 'vs' }, 'items it newly got right vs newly wrong on B\'s fresh exam: ' + X.honest.reason)));
  const f6 = X.forgeries.find((f) => f.kind === 'F6');
  $('lesson').textContent = 'A\'s longer run reached B safely: B went from ' + pct(r.alone.clean) + ' to ' + pct(r.after.clean) + ' on digits neither node trained on, and the gain was larger under noise. Every forgery stopped before B parsed a byte, except the signed junk, which stopped at the parse. The honest-but-bad share carried a valid signature from a trusted key and still lost B\'s own exam (' + f6.wins + ' wins, ' + f6.losses + ' losses), so it changed nothing. A key gets a share in the door; only B\'s own data lets it in.';
  $('shares').querySelector('tbody').replaceChildren(el('tr', {}, el('td', {}, el('b', {}, 'honest')), el('td', {}, WHAT.honest), el('td', {}, STOP[X.honest.reason] + ' (' + X.honest.wins + ' wins, ' + X.honest.losses + ' losses)'), el('td', { class: 'ok' }, X.honest.adopted ? 'yes, adopted' : 'no')),
    ...X.forgeries.map((f) => el('tr', {}, el('td', {}, el('b', {}, f.kind)), el('td', {}, WHAT[f.kind]), el('td', {}, STOP[f.reason] + (f.reason === 'did-not-win' ? ' (' + f.wins + ' wins, ' + f.losses + ' losses)' : '')), el('td', { class: f.unchanged ? 'ok' : 'no' }, f.unchanged ? 'no' : 'YES'))));
  $('keys').textContent = 'A\'s public key ' + X.pubA.slice(0, 16) + '… (on B\'s roster) · C\'s public key ' + X.pubC.slice(0, 16) + '… (not on it) · A\'s signature on its shape ' + X.honest.sig.slice(0, 24) + '…';
  const ul = $('results'); ul.replaceChildren();
  const li = (t) => ul.append(el('li', {}, t));
  li('B alone ' + pct(r.alone.clean) + ' → B after ' + pct(r.after.clean) + ' clean; ' + pct(r.alone.n25) + ' → ' + pct(r.after.n25) + ' at 25% noise; lower bounds ' + pts(r.lows.M1clean) + ' and ' + pts(r.lows.M1n25) + '.');
  li('Forgeries: ' + X.forgeries.slice(0, 5).map((f) => f.kind + ' stopped at ' + STOP[f.reason]).join('; ') + '.');
  li('The honest-but-bad share F6: ' + f6.wins + ' wins and ' + f6.losses + ' losses on B\'s exam, refused.');
  for (const g of GATES) li('Mutation gate on ' + g.kernel + ': ' + g.killed + ' of ' + g.total + ' caught, ' + g.ignored + ' baselined.');
  $('faq-failed').textContent = failed.length ? failed.map((x) => x.id + ': ' + PLAIN[x.id] + '.').join(' ') + ' Each failure is kept on the record.' : 'Nothing measured failed its bar on this run. The limits are listed in the white paper.';
  const gl = (k) => { const g = GATES.find((x) => x.kernel === k); return g ? 'mutation gate ' + g.killed + '/' + g.total + ', ' + g.ignored + ' baselined' : 'pinned and checked in CI'; };
  $('parts').replaceChildren(...[['src/exchange.mjs', 'Keys, shares, the sealed receive order, the forgeries, and the whole trade.'], ['src/eval.mjs', 'H read once: B alone against B after, clean and noisy, and every claim against its bar.'], ['vendor/', 'Rungs 1–3 and the estate\'s Ed25519 keys, byte for byte.'], ['worker.mjs + app.mjs', 'The trade and the judgement re-run in the tab; every number filled from the committed files.']]
    .map(([h, t]) => el('div', { class: 'card' }, el('div', { class: 'k' }, h), el('p', { style: 'font-size:14.5px;margin-top:4px' }, t), el('p', { class: 'vs', style: 'margin-top:6px;color:var(--accent)' }, gl(h)))));
  $('timeline').replaceChildren(...[['Seal 1', 'CLAIMS.md alone: the nodes, the exchange, six shares, every bar.'], ['The runs and the trade', 'Both nodes and the exchange, on the training pools only (data/exchange.json).'], ['Seal 2', 'The exchange, B\'s shapes and the code frozen by hash (SEAL2.md).'], ['H, once', 'The 10,000 test digits read once (data/record.json).']].map(([a, b]) => el('li', {}, el('b', {}, a), ' · ', b)));
}

let worker = null, seq = 0;
function ask(msg) { if (!worker) worker = new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' }); return new Promise((resolve) => { const id = ++seq; const on = (e) => { if (e.data.id === id) { worker.removeEventListener('message', on); resolve(e.data); } }; worker.addEventListener('message', on); worker.postMessage({ ...msg, id }); }); }
function proof(rows, status) {
  const tb = $('proof').querySelector('tbody'); tb.replaceChildren();
  let all = true;
  for (const [w, x, y] of rows) { const same = x === y; all = all && same; tb.append(el('tr', {}, el('td', {}, w), el('td', { class: 'num' }, String(x).slice(0, 24)), el('td', { class: 'num' }, String(y).slice(0, 24)), el('td', { class: same ? 'ok' : 'no' }, same ? '✓ same' : '✗ differs'))); }
  $('proof').hidden = false;
  $('gostatus').textContent = (all ? '✓ ' : '✗ ') + status(all);
}
$('trade').onclick = async () => {
  $('trade').disabled = true; $('gostatus').textContent = 'rebuilding A\'s key, re-signing, checking all six shares…';
  const r = await ask({ do: 'trade' });
  $('trade').disabled = false;
  if (!r.ok) { $('gostatus').textContent = 'it did not run: ' + r.why; return; }
  const t = r.trade;
  proof([['A\'s public key', t.pubA, X.pubA], ['A\'s signature on its shape', t.honest.sig, X.honest.sig], ['the honest share', t.honest.reason, X.honest.reason], ...t.forgeries.map((f, i) => [f.kind, f.reason, X.forgeries[i].reason]), ['B\'s shape afterwards is A\'s', String(t.after), 'true']],
    (all) => (all ? 'your browser re-signed the share and refused every forgery, exactly as recorded' : 'your browser differs from the record') + ' · ' + (r.ms / 1000).toFixed(1) + ' s');
};
$('go').onclick = async () => {
  $('go').disabled = true; $('gostatus').textContent = 'reading 10,000 test digits twice each, with both shapes…';
  const r = await ask({ do: 'rerun' });
  $('go').disabled = false;
  if (!r.ok) { $('gostatus').textContent = 'it did not run: ' + r.why; return; }
  const a = r.record, b = REC.record;
  proof([['B alone, clean', a.alone.clean, b.alone.clean], ['B after, clean', a.after.clean, b.after.clean], ['B after, 25% noise', a.after.n25, b.after.n25], ['the hash of the record', a.hash, b.hash]], (all) => (all ? 'your tab reproduced the record, hash and all' : 'your tab differs from the record') + ' · ' + (r.ms / 1000).toFixed(1) + ' s');
};

const gbp = (x) => '£' + Math.round(x).toLocaleString('en-GB');
function renderCost() {
  if (!BASIS) { $('c-head').textContent = 'The sourced basis did not load; reload the page.'; return; }
  const v = (id) => Number($(id).value);
  const r = mintCase(BASIS, { hoursPerWeek: v('c-hours'), share: v('c-share') / 100, seats: v('c-seats'), casesPerWeek: v('c-cases'), years: v('c-years') });
  if (!r.ok) { $('c-head').textContent = 'Check the inputs: ' + r.why + '.'; return; }
  const yrs = r.inputs.years + (r.inputs.years === 1 ? ' year' : ' years');
  $('c-overh').textContent = 'Over ' + yrs;
  $('c-head').textContent = `This process costs you ${gbp(r.perYear.today)} a year in staff time today. Owning it: ${gbp(r.perYear.own)} a year, which is ${gbp(r.savingPerYear)} a year back and ${gbp(r.savingOver)} over ${yrs}.`;
  const rows = [['Today', 'Your team does all of it.', 'today'], ['Rent AI assistant seats', `Microsoft 365 Copilot for ${r.inputs.seats} people (${gbp(r.lines.seats)} a year). It helps each person; the work, and the staff time, stay.`, 'rentSeats'],
    ['Call a cloud AI on every case', `Takes the same share off, billed per case at Claude Sonnet 5 API rates (${gbp(r.lines.api)} a year at your volume), and every case leaves your building.`, 'cloudApi'],
    ['Own it', `Takes the same share off on a machine you already have, for about ${gbp(r.lines.power)} a year of electricity. No seats, no meter, nothing leaves.`, 'own']];
  const tb = $('c-table').querySelector('tbody'); tb.replaceChildren();
  for (const [a, b, k] of rows) tb.append(el('tr', {}, el('td', {}, el('b', {}, a)), el('td', {}, b), el('td', { class: 'num' }, gbp(r.perYear[k])), el('td', { class: 'num' }, gbp(r.over[k]))));
  $('c-note').textContent = `Owning beats the cloud route by ${gbp(r.versusCloudOver)} over ${yrs} at this volume. Staff time is a floor: the UK median wage, with on-costs left out.`;
  $('c-board').textContent = `One owned node improved another by sharing a signed shape, and every forged share was refused. Pick one task your sites each do by hand. Today it costs ${gbp(r.perYear.today)} a year in staff time at one site. If an owned system takes off the share you estimate, that is ${gbp(r.savingPerYear)} a year back per site, with nothing leaving the building, and the fee is due only on a receipt that it beat your current way on your own data.`;
}

async function main() {
  [REC, X, BASIS] = await Promise.all(['data/record.json', 'data/exchange.json', 'vendor/liveware/basis.json'].map(json));
  GATES = (await Promise.all(['exchange', 'eval'].map((k) => json('receipts/gate-' + k + '.json')))).filter(Boolean);
  $('c-src').replaceChildren(...sourcesOf(BASIS || {}).map((s) => { const li = el('li', {}, s.what + (s.source ? ': ' : '')); if (s.source) { const a = el('a', { href: s.source, target: '_blank', rel: 'noopener' }); try { a.textContent = new URL(s.source).hostname; } catch { a.textContent = s.source; } li.append(a); } return li; }));
  for (const id of ['c-hours', 'c-share', 'c-seats', 'c-cases', 'c-years']) $(id).addEventListener('input', renderCost);
  renderCost();
  if (!REC || !X) { $('verdictline').textContent = 'The record did not load; reload the page.'; return; }
  fill();
}
main();
