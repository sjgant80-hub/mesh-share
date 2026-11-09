# Seal 2 · the exchange frozen, before H is read

Committed after seal 1 (`CLAIMS.md`, 0a9f4b6). Everything below came from the two training pools only. **No code in this
repository has read the MNIST test file.** The next commit runs `tools/eval.mjs` once, which refuses to run unless this
file names B's two shapes and the exchange record below.

## The exchange (from `data/exchange.json`, sha256 5bc418801f8faf93407ecf5dc91554a4e5d49d052349b9576765d1a1eba63bd0)

- **Node A:** 600 cycles on rows 0–29,999, 71 changes kept. Its shape `data/cell-A.txt`, sha256
  1cd61bfbf39377e39e4ed80135da2032d1d0b0028badd68d51858c5238ab5758.
- **Node B alone:** 60 cycles on rows 30,000–59,999, 3 changes kept. Its shape `data/cell-B.txt`, sha256
  **4a8fd2bc6feba9f6b74b58cd211ca015467774f8523ca0e31a854d04d830d334**.
- **The honest share:** adopted after clearing B's gate on B's own fresh exam, 30 wins and 11 losses. B after the
  exchange, `data/cell-after.txt`, sha256 **1cd61bfbf39377e39e4ed80135da2032d1d0b0028badd68d51858c5238ab5758** (A's shape).
- **The forgeries:** F1 bad-signature · F2 unknown-key · F3 bad-signature · F4 bad-signature · F5 not-a-cell ·
  F6 did-not-win. None changed B.
- Exchange hash: 817084085c8a6b158d0febcdde2ed0a7c07c0d23af8f88dc4aebd050104e9e18. It re-derives byte for byte
  (`node tools/exchange.mjs --check`).

## The code, frozen here

| file | sha256 | mutation gate (witness v0.6) |
|---|---|---|
| `src/exchange.mjs` | 7918bd858c727a9817e7154893e9d668eff71f8bef95b9b2bd21f24454dc42fd | 11 of 11 caught, 0 baselined |
| `src/eval.mjs` | 5102ff8a705cc858691fbe78aac0d3c38a3c2b3fa3e354a5df727eaf53056c71 | 22 of 22 caught, 0 baselined |
