import { CollaborativeFilteringRecommender } from './base';
import { UserBasedCFRecommender } from './user-based';
import { ItemBasedCFRecommender } from './item-based';

export type CFMethod = 'user-based' | 'item-based';

interface CFConfig {
  method: CFMethod;
  minRatings?: number;
  minSimilarItems?: number;
  minSimilarUsers?: number;
  ratingThreshold?: number;
}

export class CollaborativeFilteringFactory {
  /**
   * Create a new recommender instance based on the specified method
   * @param config Configuration for the recommender
   * @returns A CollaborativeFilteringRecommender instance
   */
  static createRecommender(config: CFConfig): CollaborativeFilteringRecommender {
    const { 
      method,
      minRatings = 1,
      minSimilarItems = 2,
      minSimilarUsers = 1,
      ratingThreshold = 2
    } = config;

    switch (method) {
      case 'user-based':
        return new UserBasedCFRecommender(
          minRatings,
          minSimilarUsers,
          ratingThreshold
        );
      
      case 'item-based':
        return new ItemBasedCFRecommender(
          minRatings,
          minSimilarItems,
          ratingThreshold
        );
      
      default:
        throw new Error(`Unknown CF method: ${method}`);
    }
  }

  /**
   * Get available recommendation methods
   * @returns Array of available methods
   */
  static getAvailableMethods(): CFMethod[] {
    return ['user-based', 'item-based'];
  }

  /**
   * Get default configuration for a method
   * @param method Recommendation method
   * @returns Default configuration
   */
  static getDefaultConfig(method: CFMethod): Partial<CFConfig> {
    const baseConfig = {
      minRatings: 5,
      ratingThreshold: 2
    };

    switch (method) {
      case 'user-based':
        return {
          ...baseConfig,
          minSimilarUsers: 3
        };
      
      case 'item-based':
        return {
          ...baseConfig,
          minSimilarItems: 3
        };
      
      default:
        return baseConfig;
    }
  }

  /**
   * Validate configuration for a method
   * @param config Configuration to validate
   * @returns Validation result and any error messages
   */
  static validateConfig(config: CFConfig): { 
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

    if (config.minRatings !== undefined && config.minRatings < 1) {
      errors.push('minRatings must be at least 1');
    }

    if (config.ratingThreshold !== undefined && 
        (config.ratingThreshold < 0 || config.ratingThreshold > 5)) {
      errors.push('ratingThreshold must be between 0 and 5');
    }

    switch (config.method) {
      case 'user-based':
        if (config.minSimilarUsers !== undefined && config.minSimilarUsers < 1) {
          errors.push('minSimilarUsers must be at least 1');
        }
        break;

      case 'item-based':
        if (config.minSimilarItems !== undefined && config.minSimilarItems < 1) {
          errors.push('minSimilarItems must be at least 1');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a recommender with validated configuration
   * @param config Configuration for the recommender
   * @returns A CollaborativeFilteringRecommender instance
   * @throws Error if configuration is invalid
   */
  static createValidatedRecommender(config: CFConfig): CollaborativeFilteringRecommender {
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
  static getMethodDescription(method: CFMethod): string {
    switch (method) {
      case 'user-based':
        return 'User-based collaborative filtering finds users with similar rating patterns ' +
               'and recommends items that these similar users have rated highly. This method ' +
               'is good at capturing personal preferences and taste.';
      
      case 'item-based':
        return 'Item-based collaborative filtering identifies relationships between items ' +
               'based on user rating patterns. It recommends items similar to ones the user ' +
               'has rated highly. This method is more stable and computationally efficient.';
      
      default:
        return 'Unknown collaborative filtering method';
    }
  }
}
