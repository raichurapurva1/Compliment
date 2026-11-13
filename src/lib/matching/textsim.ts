// Lightweight free-text similarity (bag-of-words cosine).
//
// The spec calls for embeddings as a tiebreaker only, never the main score. This stands in
// for an embedding model so the prototype runs with no extra API keys. To upgrade, store an
// embedding per profile and replace textSimilarity() with cosine similarity of the vectors.

const STOP = new Set(
  "a an and are as at be but by for from has have i i'm in is it its me my of on or our so that the their them they this to was we were with you your".split(
    " ",
  ),
);

function terms(text: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9+#]+/)) {
    if (raw.length < 3 || STOP.has(raw)) continue;
    const t = raw.replace(/(ing|ed|es|s)$/, "");
    m.set(t, (m.get(t) ?? 0) + 1);
  }
  return m;
}

export function textSimilarity(a: string, b: string): number {
  const A = terms(a);
  const B = terms(b);
  if (A.size === 0 || B.size === 0) return 0;
  let dot = 0;
  for (const [t, n] of A) dot += n * (B.get(t) ?? 0);
  const mag = (m: Map<string, number>) => Math.sqrt([...m.values()].reduce((s, n) => s + n * n, 0));
  return dot / (mag(A) * mag(B));
}
