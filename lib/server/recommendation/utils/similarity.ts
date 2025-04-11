/**
 * Calculate cosine similarity between two vectors
 * @param vecA First vector
 * @param vecB Second vector
 * @returns Cosine similarity score between 0 and 1
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  // Prevent division by zero
  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate Euclidean distance between two vectors
 * @param vecA First vector
 * @param vecB Second vector
 * @returns Euclidean distance (lower means more similar)
 */
export function calculateEuclideanDistance(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return Infinity;
  }

  let sumSquaredDiff = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sumSquaredDiff += diff * diff;
  }

  return Math.sqrt(sumSquaredDiff);
}

/**
 * Calculate Pearson correlation coefficient between two vectors
 * @param vecA First vector
 * @param vecB Second vector
 * @returns Correlation coefficient between -1 and 1
 */
export function calculatePearsonCorrelation(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length < 2) {
    return 0;
  }

  // Calculate means
  const meanA = vecA.reduce((sum, val) => sum + val, 0) / vecA.length;
  const meanB = vecB.reduce((sum, val) => sum + val, 0) / vecB.length;

  let numerator = 0;
  let denominatorA = 0;
  let denominatorB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const diffA = vecA[i] - meanA;
    const diffB = vecB[i] - meanB;
    numerator += diffA * diffB;
    denominatorA += diffA * diffA;
    denominatorB += diffB * diffB;
  }

  // Prevent division by zero
  if (denominatorA === 0 || denominatorB === 0) {
    return 0;
  }

  return numerator / (Math.sqrt(denominatorA) * Math.sqrt(denominatorB));
}

/**
 * Calculate Jaccard similarity between two sets
 * @param setA First set
 * @param setB Second set
 * @returns Jaccard similarity score between 0 and 1
 */
export function calculateJaccardSimilarity<T>(setA: Set<T>, setB: Set<T>): number {
  if (setA.size === 0 && setB.size === 0) {
    return 0;
  }

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Normalize a vector to unit length
 * @param vec Vector to normalize
 * @returns Normalized vector
 */
export function normalizeVector(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude === 0) {
    return new Array(vec.length).fill(0);
  }

  return vec.map(val => val / magnitude);
}
