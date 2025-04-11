import { HybridRecommender } from './base';
import { WeightedHybridRecommender } from './weighted';
import { SwitchingHybridRecommender } from './switching';
import { HybridWeights } from '../types';

export type HybridMethod = 'weighted' | 'switching';

interface HybridConfig {
  method: HybridMethod;
  weights: HybridWeights;
  minScore?: number;
  maxScore?: number;
  switchingCriteria?: {
    minRatings?: number;
    minSimilarity?: number;
    coldStartThreshold?: number;
  };
}

export class HybridRecommenderFactory {
  /**
   * Create a new recommender instance based on the specified method
   * @param config Configuration for the recommender
   * @returns A HybridRecommender instance
   */
  static createRecommender(config: HybridConfig): HybridRecommender {
    const { method, weights } = config;

    switch (method) {
      case 'weighted':
        return new WeightedHybridRecommender(
          weights,
          config.minScore,
          config.maxScore
        );
      
      case 'switching':
        return new SwitchingHybridRecommender(
          weights,
          config.switchingCriteria
        );
      
      default:
        throw new Error(`Unknown hybrid method: ${method}`);
    }
  }

  /**
   * Get available recommendation methods
   * @returns Array of available methods
   */
  static getAvailableMethods(): HybridMethod[] {
    return ['weighted', 'switching'];
  }

  /**
   * Get default configuration for a method
   * @param method Recommendation method
   * @returns Default configuration
   */
  static getDefaultConfig(method: HybridMethod): Partial<HybridConfig> {
    const baseWeights: HybridWeights = {
      content_based: 1,
      collaborative: 1,
      matrix_factorization: 1
    };

    switch (method) {
      case 'weighted':
        return {
          weights: baseWeights,
          minScore: 1,
          maxScore: 5
        };
      
      case 'switching':
        return {
          weights: baseWeights,
          switchingCriteria: {
            minRatings: 10,
            minSimilarity: 0.1,
            coldStartThreshold: 5
          }
        };
      
      default:
        return { weights: baseWeights };
    }
  }

  /**
   * Validate configuration for a method
   * @param config Configuration to validate
   * @returns Validation result and any error messages
   */
  static validateConfig(config: HybridConfig): { 
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

    if (!config.weights) {
      errors.push('Weights are required');
      return { isValid: false, errors };
    }

    const weightSum = Object.values(config.weights).reduce((a, b) => a + b, 0);
    if (weightSum === 0) {
      errors.push('At least one weight must be non-zero');
    }

    switch (config.method) {
      case 'weighted':
        if (config.minScore !== undefined && config.maxScore !== undefined) {
          if (config.minScore >= config.maxScore) {
            errors.push('minScore must be less than maxScore');
          }
        }
        break;

      case 'switching':
        if (config.switchingCriteria) {
          const { minRatings, minSimilarity, coldStartThreshold } = config.switchingCriteria;
          
          if (minRatings !== undefined && minRatings < 1) {
            errors.push('minRatings must be at least 1');
          }
          
          if (minSimilarity !== undefined && 
              (minSimilarity < 0 || minSimilarity > 1)) {
            errors.push('minSimilarity must be between 0 and 1');
          }
          
          if (coldStartThreshold !== undefined && coldStartThreshold < 1) {
            errors.push('coldStartThreshold must be at least 1');
          }
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
   * @returns A HybridRecommender instance
   * @throws Error if configuration is invalid
   */
  static createValidatedRecommender(config: HybridConfig): HybridRecommender {
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
  static getMethodDescription(method: HybridMethod): string {
    switch (method) {
      case 'weighted':
        return 'Weighted hybrid combines recommendations from multiple sources using ' +
               'configurable weights. This provides a balanced approach that leverages ' +
               'the strengths of each method.';
      
      case 'switching':
        return 'Switching hybrid dynamically chooses the most appropriate recommendation ' +
               'method based on the current context. It handles cold-start problems and ' +
               'adapts to different user scenarios.';
      
      default:
        return 'Unknown hybrid method';
    }
  }
}
