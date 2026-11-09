#!/usr/bin/env node
// tools/exchange.mjs — both nodes and the whole exchange, on the two training pools only (H is never touched here).
// Writes data/exchange.json and the three shapes (data/cell-A.txt, data/cell-B.txt, data/cell-after.txt). `--check`
// re-derives all four byte for byte (CI).
import { readFileSync, writeFileSync } from 'node:fs';
import { train, pools } from './data.mjs';
import X from '../src/exchange.mjs';
const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const t0 = Date.now();
const r = await X.exchange({ ...pools(train()), s0Text: read('vendor/code-rsi/vendor/settling-cell/data/cell.txt') });
const { aText, bText, after, ...rest } = r;
const out = JSON.stringify(rest, null, 1) + '\n';
const files = { 'data/exchange.json': out, 'data/cell-A.txt': aText, 'data/cell-B.txt': bText, 'data/cell-after.txt': after };
if (process.argv.includes('--check')) {
  const same = Object.entries(files).every(([p, v]) => read(p) === v);
  console.log(same ? 'EXCHANGE REPRODUCED · ' + r.hash.slice(0, 16) : 'EXCHANGE DIFFERS'); process.exit(same ? 0 : 1);
}
for (const [p, v] of Object.entries(files)) writeFileSync(new URL(p, ROOT), v);
console.log('exchange in ' + Math.round((Date.now() - t0) / 1000) + ' s · A kept ' + r.runA.accepted + '/' + r.runA.cycles + ', B kept ' + r.runB.accepted + '/' + r.runB.cycles +
  ' · honest share: ' + r.honest.reason + ' (' + r.honest.wins + ' wins, ' + r.honest.losses + ' losses) · forgeries: ' + r.forgeries.map((f) => f.kind + '=' + f.reason + (f.unchanged ? '' : '!CHANGED')).join(' ') + ' · ' + r.hash);
