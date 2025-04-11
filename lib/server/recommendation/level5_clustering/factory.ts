import { ClusteringRecommender } from './base';
import { KMeansRecommender } from './kmeans';

export type ClusteringMethod = 'kmeans';

interface ClusteringConfig {
  method: ClusteringMethod;
  numClusters?: number;
  minClusterSize?: number;
  maxIterations?: number;
  convergenceThreshold?: number;
  useReviews?: boolean;
}

export class ClusteringRecommenderFactory {
  /**
   * Create a new recommender instance based on the specified method
   * @param config Configuration for the recommender
   * @returns A ClusteringRecommender instance
   */
  static createRecommender(config: ClusteringConfig): ClusteringRecommender {
    const { 
      method,
      numClusters = 10,
      minClusterSize = 5,
      maxIterations = 100,
      convergenceThreshold = 0.001,
      useReviews = true
    } = config;

    switch (method) {
      case 'kmeans':
        return new KMeansRecommender(
          numClusters,
          minClusterSize,
          maxIterations,
          convergenceThreshold,
          useReviews
        );
      
      default:
        throw new Error(`Unknown clustering method: ${method}`);
    }
  }

  /**
   * Get available recommendation methods
   * @returns Array of available methods
   */
  static getAvailableMethods(): ClusteringMethod[] {
    return ['kmeans'];
  }

  /**
   * Get default configuration for a method
   * @param method Recommendation method
   * @returns Default configuration
   */
  static getDefaultConfig(method: ClusteringMethod): Partial<ClusteringConfig> {
    switch (method) {
      case 'kmeans':
        return {
          numClusters: 10,
          minClusterSize: 5,
          maxIterations: 100,
          convergenceThreshold: 0.001,
          useReviews: true
        };
      
      default:
        return {};
    }
  }

  /**
   * Validate configuration for a method
   * @param config Configuration to validate
   * @returns Validation result and any error messages
   */
  static validateConfig(config: ClusteringConfig): { 
    isValid: boolean; 
    errors: string[] 
  } {
    const errors: string[] = [];

    if (!config.method) {
      errors.push('Method is required');
      return { isValid: false, errors };
    }

    if (!this.getAvailableMethods().includes(config.method)) {
      errors.push(`Invalid method: ${config.method}`);
      return { isValid: false, errors };
    }

    if (config.numClusters !== undefined && config.numClusters < 2) {
      errors.push('numClusters must be at least 2');
    }

    if (config.minClusterSize !== undefined && config.minClusterSize < 1) {
      errors.push('minClusterSize must be at least 1');
    }

    if (config.maxIterations !== undefined && config.maxIterations < 1) {
      errors.push('maxIterations must be at least 1');
    }

    if (config.convergenceThreshold !== undefined && 
        (config.convergenceThreshold <= 0 || config.convergenceThreshold >= 1)) {
      errors.push('convergenceThreshold must be between 0 and 1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a recommender with validated configuration
   * @param config Configuration for the recommender
   * @returns A ClusteringRecommender instance
   * @throws Error if configuration is invalid
   */
  static createValidatedRecommender(config: ClusteringConfig): ClusteringRecommender {
    const validation = this.validateConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    return this.createRecommender(config);
  }

  /**
   * Get a description of what each method does
   * @param method Recommendation method
   * @returns Description of the method
   */
  static getMethodDescription(method: ClusteringMethod): string {
    switch (method) {
      case 'kmeans':
        return 'K-means clustering groups similar restaurants together based on their ' +
               'features and reviews. It provides recommendations by identifying clusters ' +
               'that match user preferences and suggesting other restaurants from those ' +
               'clusters.';
      
      default:
        return 'Unknown clustering method';
    }
  }

  /**
   * Find optimal number of clusters
   */
  static async findOptimalClusters(
    method: ClusteringMethod,
    restaurants: any[],
    reviews: any[],
    maxK: number = 20,
    minK: number = 2
  ): Promise<{
    optimalK: number;
    scores: { k: number; score: number }[];
  }> {
    switch (method) {
      case 'kmeans':
        return KMeansRecommender.findOptimalK(restaurants, reviews, maxK, minK);
      
      default:
        throw new Error(`Unknown clustering method: ${method}`);
    }
  }
}
