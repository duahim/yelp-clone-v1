import { calculateCosineSimilarity } from '../utils/similarity';
export * from './base';
export * from './kmeans';
export * from './factory';

/**
 * Level 5: Clustering-Based Recommendation
 * 
 * This module implements clustering-based recommendation algorithms that group
 * similar restaurants together and use these clusters to generate recommendations.
 * It includes:
 * 
 * 1. K-Means Clustering
 *    - Groups restaurants based on feature similarity
 *    - Uses TF-IDF vectors from categories and reviews
 *    - Provides cluster-based recommendations
 *    - Handles cluster rebalancing for better distribution
 * 
 * Usage example:
 * ```typescript
 * import { ClusteringRecommenderFactory } from './factory';
 * 
 * // Find optimal number of clusters
 * const { optimalK } = await ClusteringRecommenderFactory.findOptimalClusters(
 *   'kmeans',
 *   restaurants,
 *   reviews
 * );
 * 
 * // Create a recommender
 * const recommender = ClusteringRecommenderFactory.createRecommender({
 *   method: 'kmeans',
 *   numClusters: optimalK,
 *   minClusterSize: 5,
 *   useReviews: true
 * });
 * 
 * // Initialize with data
 * await recommender.initialize(restaurants, reviews);
 * 
 * // Get recommendations
 * const recommendations = await recommender.getRecommendations(
 *   userId,
 *   userRatings
 * );
 * ```
 * 
 * Key Features:
 * - Automatic determination of optimal cluster count
 * - Feature extraction from both categories and reviews
 * - Cluster quality metrics (silhouette score, Davies-Bouldin index)
 * - Minimum cluster size enforcement
 * - Detailed explanations of cluster assignments
 * - Comprehensive logging and statistics
 * 
 * The clustering approach allows for:
 * - Discovery of natural groupings in restaurant data
 * - Efficient recommendation generation
 * - Interpretable results through cluster analysis
 * - Handling of sparse rating data
 * - Scalability to large datasets
 */

// Re-export types specific to clustering
export type { 
  ClusteringResult,
  Restaurant,
  Review,
  Rating,
  RecommendationResult
} from '../types';

// Export factory types
export type { ClusteringMethod } from './factory';

// Export constants
export const DEFAULT_NUM_CLUSTERS = 10;
export const DEFAULT_MIN_CLUSTER_SIZE = 5;
export const DEFAULT_MAX_ITERATIONS = 100;
export const DEFAULT_CONVERGENCE_THRESHOLD = 0.001;

// Export error messages
export const ERRORS = {
  INITIALIZATION_FAILED: 'Failed to initialize clustering recommender',
  INVALID_CONFIG: 'Invalid clustering configuration',
  EMPTY_CLUSTER: 'Empty cluster detected',
  NO_CONVERGENCE: 'Failed to converge within maximum iterations',
  INSUFFICIENT_DATA: 'Insufficient data for clustering',
  INVALID_USER: 'Invalid user ID provided',
  INVALID_BUSINESS: 'Invalid business ID provided'
} as const;

// Export metric names
export const METRICS = {
  SILHOUETTE_SCORE: 'Silhouette Score',
  DAVIES_BOULDIN_INDEX: 'Davies-Bouldin Index',
  CLUSTER_SIZE: 'Cluster Size',
  CLUSTER_DENSITY: 'Cluster Density',
  INTER_CLUSTER_DISTANCE: 'Inter-cluster Distance',
  INTRA_CLUSTER_DISTANCE: 'Intra-cluster Distance'
} as const;

// Export utility functions
export const utils = {
  /**
   * Calculate average similarity between vectors
   */
  calculateAverageSimilarity(
    vectors1: number[][],
    vectors2: number[][]
  ): number {
    if (vectors1.length === 0 || vectors2.length === 0) return 0;
    
    let totalSimilarity = 0;
    let count = 0;
    
    for (const v1 of vectors1) {
      for (const v2 of vectors2) {
        totalSimilarity += calculateCosineSimilarity(v1, v2);
        count++;
      }
    }
    
    return count > 0 ? totalSimilarity / count : 0;
  },

  /**
   * Calculate silhouette score for a point
   */
  calculateSilhouetteScore(
    vector: number[],
    clusterMembers: number[][],
    otherClusters: number[][]
  ): number {
    // Calculate average distance to own cluster (a)
    const otherMembers = clusterMembers.filter(v => v !== vector);
    const a = otherMembers.length > 0
      ? this.calculateAverageSimilarity([vector], otherMembers)
      : 0;

    // Calculate minimum average distance to other clusters (b)
    const b = otherClusters.length > 0
      ? Math.min(...otherClusters.map(cluster => 
          this.calculateAverageSimilarity([vector], [cluster])))
      : 0;

    return a === 0 && b === 0 ? 0 : (b - a) / Math.max(a, b);
  },

  /**
   * Calculate Davies-Bouldin index for clusters
   */
  calculateDaviesBouldinIndex(
    clusters: Map<number, number[][]>,
    centroids: Map<number, number[]>
  ): number {
    let sum = 0;
    let count = 0;

    clusters.forEach((members, i) => {
      if (members.length === 0) return;

      let maxRatio = 0;
      clusters.forEach((otherMembers, j) => {
        if (i !== j && otherMembers.length > 0) {
          const centroid1 = centroids.get(i)!;
          const centroid2 = centroids.get(j)!;
          const centerDist = 1 - calculateCosineSimilarity(centroid1, centroid2);

          // Calculate average distances to centroids
          const scatter1 = this.calculateAverageSimilarity([centroid1], members);
          const scatter2 = this.calculateAverageSimilarity([centroid2], otherMembers);

          const ratio = centerDist > 0 ? (scatter1 + scatter2) / centerDist : 0;
          maxRatio = Math.max(maxRatio, ratio);
        }
      });

      sum += maxRatio;
      count++;
    });

    return count > 0 ? sum / count : 0;
  }
};

// Export similarity calculation function
export { calculateCosineSimilarity } from '../utils/similarity';
