export * from './base';
export * from './user-based';
export * from './item-based';
export * from './factory';

/**
 * Level 2: Collaborative Filtering
 * 
 * This module implements collaborative filtering recommendation algorithms that
 * analyze user rating patterns to find similar users or items. It includes:
 * 
 * 1. User-Based Collaborative Filtering
 *    - Finds users with similar rating patterns
 *    - Recommends items that similar users have rated highly
 *    - Good for capturing personal preferences and taste
 * 
 * 2. Item-Based Collaborative Filtering
 *    - Identifies relationships between items based on user ratings
 *    - Recommends items similar to ones the user has rated highly
 *    - More stable and computationally efficient
 * 
 * Usage example:
 * ```typescript
 * import { CollaborativeFilteringFactory } from './factory';
 * 
 * // Create a recommender
 * const recommender = CollaborativeFilteringFactory.createRecommender({
 *   method: 'user-based',
 *   minRatings: 5,
 *   minSimilarUsers: 3,
 *   ratingThreshold: 3.5
 * });
 * 
 * // Initialize with rating data
 * await recommender.initialize(ratings);
 * 
 * // Get recommendations
 * const recommendations = await recommender.getRecommendations(userId, 5);
 * ```
 * 
 * Key Features:
 * - Pearson correlation for similarity calculation
 * - Configurable thresholds for minimum ratings and similarity
 * - Detailed explanations for recommendations
 * - Caching for item similarities in item-based CF
 * - Comprehensive logging for debugging and monitoring
 * 
 * Both methods extend the base CollaborativeFilteringRecommender class and
 * implement their own versions of rating prediction and recommendation generation.
 */

// Re-export types that are specific to collaborative filtering
export type { 
  Rating,
  UserPreferences,
  UserSimilarityScore,
  ItemSimilarityScore,
  RecommendationResult
} from '../types';

// Export common utilities used by collaborative filtering
export { calculatePearsonCorrelation } from '../utils/similarity';

// Export factory types
export type { CFMethod } from './factory';
