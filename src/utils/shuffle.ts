/**
 * Fisher-Yates (Knuth) Shuffle
 * Randomly shuffles an array in place or returns a newly shuffled shallow copy.
 * Ensures an unbiased, uniform permutation of elements.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
