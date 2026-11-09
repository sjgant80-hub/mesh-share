# Mesh share

Live: **https://sjgant80-hub.github.io/mesh-share/**

Rung 4 of the geometric ladder: **a shape evolved on node A improves node B when shared over the signed mesh, and a
forged shape is refused.** B checks the roster and the Ed25519 signature on the raw bytes before parsing, then parses,
then tests the shape on its own fresh exam, and only then adopts. Built on Rungs 1–3, vendored byte for byte.

## The result (the 10,000 MNIST test digits, read once): all 4 measured claims held

| | claim | measured |
|---|---|---|
| ✓ | M1 sharing helps | B alone 55.8% → B after 61.6% clean (lower bound +5.0 points); 39.1% → 50.8% at 25% noise (+10.9) |
| ✓ | M2 forgeries refused before parsing | F1, F3, F4 at the signature; F2 at the roster; F5 at the parse; none changed B |
| ✓ | M3 trust the key, check the shape | the honest-but-bad share (validly signed) lost B's exam 8 to 29 and was refused |
| ✓ | M4 the honest share earned its place | adopted after 30 wins to 11 losses on B's own exam |

The limits: two nodes, one exchange; B's final shape is A's (the gain is A's longer run, delivered safely); the test
digits were read before by Rung 3 for a different cell and task.

## Re-derive it

```bash
node --test test/mesh.test.mjs test/page.test.mjs
node tools/exchange.mjs --check
node tools/eval.mjs --check
```

[`CLAIMS.md`](CLAIMS.md) (seal 1, 0a9f4b6) · [`SEAL2.md`](SEAL2.md) (8796348) · `data/record.json`. MNIST, CC BY-SA 3.0.
Powered by the Konomi architecture, created by Thomas Frumkin. MIT licence for the code; credits in [`NOTICE`](NOTICE).
