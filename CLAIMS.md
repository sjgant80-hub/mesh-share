# mesh-share · sealed claims (seal 1, before any code of this repository)

Rung 4 of the geometric substrate ladder: **a shape evolved on node A improves node B when it is shared over the signed
mesh, and a forged shape is refused.** Every bar is fixed here. A claim that misses its bar is kept and published as failed.

## Built on the rungs below, byte for byte

- Rung 1's cell kernel and frozen cell S0 (sjgant80-hub/settling-cell; `src/cell.mjs` sha256
  590c8307b06148dbfa7c2e4a247336441e150d8235d62783c45efb53190d9101, `data/cell.txt` sha256
  095d33a8bb6d6393173b48279f60000aa2d9e3b1413abc2e18e87936dab73b88).
- Rung 2's model-free loop (sjgant80-hub/code-rsi `src/loop.mjs`, sha256
  1d8c84ebb21bc6108d6127875b493a74c2fc79045afb23d6c80793dcc9f43053).
- Rung 3's MNIST conversion (sjgant80-hub/hybrid-gate `src/mnist.mjs`, sha256
  d2e0d4faa5b3b927a0261e1def5620df317fa3925ab32fb0cb3d80a1605b3616).
- The estate's Ed25519 keys (sjgant80-hub/living-seed `vendor/keys/keys.mjs` sha256
  636969fdaaac7eab1868c6670cc7a85da1c22d65498f25e8a2ce5ad3487113e0 and `canon.mjs` sha256
  6ebe4f961ff0a2ce8693de89193921c8b5372c4e08d4941361212dd4cba29d21), WebCrypto, deterministic from a seed.

## The two nodes

- **Data:** MNIST, the same four pinned files as Rung 3. **Node A's pool:** training rows 0–29,999. **Node B's pool:**
  training rows 30,000–59,999. **Held-out H:** the 10,000 test digits. H was read once before, by Rung 3, for a
  different cell and task. Nothing in this repository has read it, and it is read here once, after seal 2.
- **Both start from S0.** **A** runs Rung 2's adaptive loop on its own pool for 600 cycles (a node with time and data).
  **B** runs the same loop on its own pool for 60 cycles (a node with little time). Each loop uses its sealed settings
  and seeds unchanged; only the pool and the cycle count differ.
- **Keys:** A's key is seeded from SHA-256("mesh-share/node-A"), an outsider C's from SHA-256("mesh-share/node-C").
  B's roster trusts A's public key only.

## The exchange

- **A shares** its final shape: the canonical cell text as UTF-8 bytes, A's Ed25519 signature over exactly those bytes,
  and A's public key.
- **B receives, in this order:** (1) the key must be on B's roster, and the signature must verify over the raw bytes,
  **before anything is parsed**; (2) the bytes must parse as a cell that builds in the exact whole-number range;
  (3) **B's own gate:** settle B's current shape and the shared shape on a fresh B exam of 200 items (B's pool, noise
  seed 900,000 + the item's position); adopt only if (wins − losses) ≥ 2. Any failure leaves B unchanged, with its reason.
- **The six shares B is sent:** the honest share from A, then five that must be refused:
  (F1) one byte of A's shape changed, with A's original signature; (F2) A's shape signed by C, who is not on the roster;
  (F3) A's signature on a different text, attached to A's shape; (F4) A's shape cut short, with A's signature;
  (F5) bytes that are not a cell, validly signed by A; (F6) an honest-but-bad share: S0 itself, validly signed by A.
  The honest share is sent first; the forgeries are each tested against the B that results.

## The claims (on H, read once)

- **M1 · sharing helps.** B after the exchange beats B alone (its own 60-cycle shape) on clean H digits: paired 95%
  lower bound > 0. **And with 25% of the pixels replaced** (16 of 64, seed 2026 + the test row): lower bound > 0.
- **M2 · forgeries are refused before parsing.** F1–F4 are refused at the signature step, F5 at the parse step, and none
  changes B.
- **M3 · trust the key, check the shape.** F6 carries a valid signature from a trusted key and is still refused by B's
  own exam gate.
- **M4 · the honest share earned its place.** B adopted A's shape only after it cleared B's gate on B's own fresh exam.
- **M5 · deterministic.** The whole exchange record (both runs' hashes, every share's verdict and reason, the H record)
  hashes the same twice, on GitHub's runner and in a browser tab; seeded Ed25519 makes every signature byte-reproducible.
- **M6 · the page.** No measured number is typed into `index.html`.
- **M7 · the data.** The MNIST files and every vendored file are byte-identical to the hashes above.
- **G · the gate on the code.** witness v0.6 on this repository's kernels: CLEAN, nothing baselined. CI green.

Bootstrap: 2,000 paired resamples, seed 99; a lower bound is the 2.5th percentile.

## What Rung 4 is not

Two nodes, one exchange: not a fabric of many nodes under loss (Rung 6), not a defence (Rung 5), not on a chip (Rung 7).
