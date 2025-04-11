// Re-export all components with namespacing
import * as ContentBased from './level1_content/index';
import * as CollaborativeFiltering from './level2_cf/index';
import * as MatrixFactorization from './level3_matrix/index';
import * as Hybrid from './level4_hybrid/index';
import * as Clustering from './level5_clustering/index';

// Export namespaced modules
export {
  ContentBased,
  CollaborativeFiltering,
  MatrixFactorization,
  Hybrid,
  Clustering
};

// Export common types
export type {
  Rating,
  Review,
  Restaurant,
  RecommendationResult,
  LogEntry
} from './types';

// Export common utilities
export { calculateCosineSimilarity } from './utils/similarity';

/**
 * Recommendation System
 * 
 * This module provides a unified interface for various recommendation algorithms
 * implemented in different levels. Each level is namespaced to avoid naming conflicts:
 * 
 * 1. ContentBased: Content-Based Filtering
 *    - TF-IDF based recommendations
 *    - LSA (Latent Semantic Analysis)
 *    - Sentence Transformer embeddings
 * 
 * 2. CollaborativeFiltering: User and Item-based CF
 *    - User-based collaborative filtering
 *    - Item-based collaborative filtering
 *    - Similarity caching
 * 
 * 3. MatrixFactorization: SVD-based methods
 *    - Basic SVD
 *    - SVD with PCA dimensionality reduction
 * 
 * 4. Hybrid: Combined approaches
 *    - Weighted hybrid
 *    - Switching hybrid
 * 
 * 5. Clustering: Cluster-based recommendations
 *    - K-means clustering
 *    - Automatic cluster size optimization
 * 
 * Usage example:
 * ```typescript
 * import { 
 *   Hybrid, 
 *   ContentBased, 
 *   CollaborativeFiltering,
 *   MatrixFactorization 
 * } from './recommendation';
 * 
 * // Create individual recommenders
 * const contentRecommender = ContentBased.Factory.createRecommender({
 *   method: 'tf-idf'
 * });
 * 
 * const cfRecommender = CollaborativeFiltering.Factory.createRecommender({
 *   method: 'user-based'
 * });
 * 
 * const mfRecommender = MatrixFactorization.Factory.createRecommender({
 *   method: 'svd-pca'
 * });
 * 
 * // Create a hybrid recommender
 * const hybridRecommender = Hybrid.Factory.createRecommender({
 *   method: 'weighted',
 *   weights: {
 *     content_based: 0.5,
 *     collaborative: 0.3,
 *     matrix_factorization: 0.2
 *   }
 * });
 * 
 * // Set individual recommenders
 * hybridRecommender.setContentRecommender(contentRecommender);
 * hybridRecommender.setCollaborativeRecommender(cfRecommender);
 * hybridRecommender.setMatrixRecommender(mfRecommender);
 * 
 * // Initialize with data
 * await hybridRecommender.initialize(restaurants, reviews, ratings);
 * 
 * // Get recommendations
 * const recommendations = await hybridRecommender.getRecommendations(userId);
 * ```
 * 
 * Each namespace provides its own:
 * - Factory for creating recommenders
 * - Base classes and implementations
 * - Type definitions
 * - Constants and error messages
 * - Utility functions
 * 
 * This modular design allows for:
 * - Clear separation of concerns
 * - Easy extension and maintenance
 * - Flexible combination of methods
 * - Consistent interface across all levels
 */

// Export common constants
export const RATING_RANGE = {
  MIN: 1,
  MAX: 5
} as const;

export const ERRORS = {
  INITIALIZATION: 'Failed to initialize recommender',
  INVALID_CONFIG: 'Invalid configuration provided',
  INVALID_USER: 'Invalid user ID provided',
  INVALID_BUSINESS: 'Invalid business ID provided',
  NO_RECOMMENDATIONS: 'No recommendations available'
} as const;

export const METRICS = {
  PRECISION: 'Precision',
  RECALL: 'Recall',
  F1_SCORE: 'F1 Score',
  MAP: 'Mean Average Precision',
  NDCG: 'Normalized Discounted Cumulative Gain',
  COVERAGE: 'Coverage',
  DIVERSITY: 'Diversity',
  NOVELTY: 'Novelty'
} as const;
