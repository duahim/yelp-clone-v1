import { 
  HybridWeights,
  RecommendationResult,
  Rating,
  Restaurant,
  Review
} from '../types';
export * from './base';
export * from './weighted';
export * from './switching';
export * from './factory';

/**
 * Level 4: Hybrid Recommendation Methods
 * 
 * This module implements hybrid recommendation approaches that combine multiple
 * recommendation methods to leverage their individual strengths and compensate
 * for their weaknesses. It includes:
 * 
 * 1. Weighted Hybrid
 *    - Combines recommendations from multiple sources using weighted scoring
 *    - Allows fine-tuning of method importance through weights
 *    - Provides balanced recommendations leveraging all available methods
 * 
 * 2. Switching Hybrid
 *    - Dynamically selects the most appropriate method based on context
 *    - Handles cold-start problems effectively
 *    - Adapts to different user scenarios (new users, active users, etc.)
 * 
 * Usage example:
 * ```typescript
 * import { HybridRecommenderFactory } from './factory';
 * 
 * // Create a weighted hybrid recommender
 * const weightedRecommender = HybridRecommenderFactory.createRecommender({
 *   method: 'weighted',
 *   weights: {
 *     content_based: 0.4,
 *     collaborative: 0.3,
 *     matrix_factorization: 0.3
 *   }
 * });
 * 
 * // Set individual recommenders
 * weightedRecommender.setContentRecommender(contentRecommender);
 * weightedRecommender.setCollaborativeRecommender(cfRecommender);
 * weightedRecommender.setMatrixRecommender(mfRecommender);
 * 
 * // Initialize with data
 * await weightedRecommender.initialize(restaurants, reviews, ratings);
 * 
 * // Get recommendations
 * const recommendations = await weightedRecommender.getRecommendations(userId);
 * ```
 * 
 * Key Features:
 * - Flexible combination of multiple recommendation methods
 * - Configurable weighting and switching strategies
 * - Comprehensive initialization with all available data
 * - Detailed explanations combining insights from all methods
 * - Fallback mechanisms for handling failures
 * - Extensive logging and statistics
 * 
 * The hybrid approach allows for:
 * - Better handling of the cold-start problem
 * - Improved recommendation quality through method combination
 * - Adaptability to different user scenarios
 * - Robustness through method diversity
 * - Transparent explanation of recommendation sources
 */

// Re-export types specific to hybrid recommendations
export type { 
  HybridWeights,
  RecommendationResult,
  Rating,
  Restaurant,
  Review
} from '../types';

// Export factory types
export type { HybridMethod } from './factory';

// Export constants
export const DEFAULT_WEIGHTS: HybridWeights = {
  content_based: 0.4,
  collaborative: 0.3,
  matrix_factorization: 0.3
};

export const DEFAULT_SWITCHING_CRITERIA = {
  minRatings: 10,
  minSimilarity: 0.1,
  coldStartThreshold: 5
};

// Export error messages
export const ERRORS = {
  NO_RECOMMENDERS: 'No recommenders have been set',
  INVALID_WEIGHTS: 'Invalid weights configuration',
  INITIALIZATION_FAILED: 'Failed to initialize one or more recommenders',
  METHOD_UNAVAILABLE: 'Requested recommendation method is not available',
  INVALID_USER: 'Invalid user ID provided',
  INVALID_BUSINESS: 'Invalid business ID provided'
} as const;

// Export metric names
export const METRICS = {
  WEIGHTED_SCORE: 'Weighted Combined Score',
  METHOD_CONTRIBUTION: 'Method Contribution Ratio',
  SWITCHING_RATE: 'Method Switching Rate',
  FALLBACK_RATE: 'Fallback Rate',
  COLD_START_RATIO: 'Cold Start User Ratio'
} as const;

// Export utility functions
export const utils = {
  /**
   * Normalize weights to sum to 1
   */
  normalizeWeights(weights: HybridWeights): HybridWeights {
    const sum = Object.values(weights).reduce((a: number, b: number) => a + b, 0);
    if (sum === 0) return weights;
    
    return {
      content_based: weights.content_based / sum,
      collaborative: weights.collaborative / sum,
      matrix_factorization: weights.matrix_factorization 
        ? weights.matrix_factorization / sum 
        : 0
    };
  },

  /**
   * Check if a user is in cold start phase
   */
  isUserColdStart(
    userRatingCount: number,
    threshold: number = DEFAULT_SWITCHING_CRITERIA.coldStartThreshold
  ): boolean {
    return userRatingCount < threshold;
  },

  /**
   * Combine multiple explanations into a single coherent explanation
   */
  combineExplanations(explanations: string[]): string {
    if (explanations.length === 0) return '';
    if (explanations.length === 1) return explanations[0];
    
    return explanations
      .filter(e => e)
      .join(' Additionally, ');
  }
};
