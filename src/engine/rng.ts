// Mulberry32 PRNG - fast, simple, deterministic
export function createRNG(seed: number): () => number {
  let state = seed >>> 0;

  return function(): number {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

// Alias for compatibility
export const createSeededRng = createRNG;
