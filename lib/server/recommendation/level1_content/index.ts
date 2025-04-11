export * from './base';
export * from './tf-idf';
export * from './lsa';
export * from './sentence-transformer';
export * from './factory';

/**
 * Level 1: Content-Based Filtering
 * 
 * This module implements content-based recommendation algorithms that analyze
 * restaurant attributes and review text to find similar items. It includes:
 * 
 * 1. TF-IDF Based Recommendations
 *    - Uses term frequency-inverse document frequency to identify important words
 *    - Good for finding restaurants with similar vocabulary in reviews
 * 
 * 2. LSA (Latent Semantic Analysis)
 *    - Uses singular value decomposition to find latent concepts
 *    - Can identify similar restaurants even with different vocabulary
 * 
 * 3. Sentence Transformer
 *    - Uses neural networks for semantic text embeddings
 *    - Best at understanding context and meaning
 * 
 * Usage example:
 * ```typescript
 * import { ContentBasedRecommenderFactory } from './factory';
 * 
 * // Create a recommender
 * const recommender = ContentBasedRecommenderFactory.createRecommender({
 *   method: 'tfidf',
 *   numFeatures: 50
 * });
 * 
 * // Build profiles
 * await recommender.buildItemProfiles(restaurants, reviews);
 * 
 * // Get recommendations
 * const recommendations = recommender.getRecommendations(
 *   userId,
 *   userRatings,
 *   5
 * );
 * ```
 * 
 * Each recommender extends the base ContentBasedRecommender class and implements
 * its own version of buildItemProfile() to create vector representations of
 * restaurants based on their reviews and attributes.
 */

// Re-export types that are specific to content-based filtering
export type { 
  ContentEmbedding,
  ItemProfile,
  SimilarityScore,
  RecommendationResult
} from '../types';

// Export common utilities used by content-based recommenders
export { normalizeVector, calculateCosineSimilarity } from '../utils/similarity';
