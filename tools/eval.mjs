#!/usr/bin/env node
// tools/eval.mjs — H, read once. It refuses to run unless SEAL2.md names B's two shapes and the exchange record by their
// SHA-256 and the MNIST test files are the ones seal 1 pinned. Writes data/record.json. `--check` re-derives it (CI).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from './data.mjs';
import E from '../src/eval.mjs';

const PINS = { 't10k-images-idx3-ubyte.gz': '8d422c7b0a1c1c79245a5bcf07fe86e33eeafee792b84584aec276f5a2dbc4e6', 't10k-labels-idx1-ubyte.gz': 'f7ae60f92e00ec6debd23a6088c31dbd2371eca3ffa0defaefb259924204aec6' };
const ROOT = new URL('../', import.meta.url);
const raw = (p) => readFileSync(new URL(p, ROOT));
const read = (p) => raw(p).toString('utf8');
const sha = (p) => createHash('sha256').update(raw(p)).digest('hex');
const stop = (why) => { console.error('eval: ' + why); process.exit(1); };

if (!existsSync(new URL('SEAL2.md', ROOT))) stop('no SEAL2.md: the exchange is not frozen, so H may not be read');
const seal = read('SEAL2.md');
for (const f of ['data/cell-B.txt', 'data/cell-after.txt', 'data/exchange.json']) if (!seal.includes(sha(f))) stop(f + ' is not what seal 2 names');
for (const [f, h] of Object.entries(PINS)) if (sha('data/mnist/' + f) !== h) stop(f + ' is not the file seal 1 pinned');

const t0 = Date.now(), x = JSON.parse(read('data/exchange.json'));
const record = E.evaluate({ H: test(), bText: read('data/cell-B.txt'), afterText: read('data/cell-after.txt'), exchange: x });
if (!record) stop('the record did not compute');
const out = JSON.stringify({ record, verdicts: E.verdicts(record, x) }, null, 1) + '\n';
if (process.argv.includes('--check')) { const same = read('data/record.json') === out; console.log(same ? 'RECORD REPRODUCED · ' + record.hash.slice(0, 16) : 'RECORD DIFFERS'); process.exit(same ? 0 : 1); }
writeFileSync(new URL('data/record.json', ROOT), out);
console.log('H: ' + record.digits + ' test digits, ' + Math.round((Date.now() - t0) / 1000) + ' s · B alone ' + record.alone.clean + ' clean / ' + record.alone.n25 + ' noisy · B after ' + record.after.clean + ' / ' + record.after.n25 + ' · record ' + record.hash);
for (const v of E.verdicts(record, x)) console.log((v.pass ? '  held   ' : '  FAILED ') + v.id + ' · ' + v.what + ' · ' + JSON.stringify(v.measured) + ' (bar ' + v.bar + ')');
