import { MatrixFactorizationRecommender } from './base';
import { SVDRecommender } from './svd';
import { SVDPCARecommender } from './svd-pca';

export type MatrixFactorizationMethod = 'svd' | 'svd-pca';

interface MatrixFactorizationConfig {
  method: MatrixFactorizationMethod;
  numFactors?: number;
  learningRate?: number;
  regularization?: number;
  minImprovement?: number;
  maxEpochs?: number;
  varianceThreshold?: number;  // For PCA
}

export class MatrixFactorizationFactory {
  /**
   * Create a new recommender instance based on the specified method
   * @param config Configuration for the recommender
   * @returns A MatrixFactorizationRecommender instance
   */
  static createRecommender(config: MatrixFactorizationConfig): MatrixFactorizationRecommender {
    const { 
      method,
      numFactors = 50,
      learningRate = 0.005,
      regularization = 0.02,
      varianceThreshold = 0.95
    } = config;

    switch (method) {
      case 'svd':
        return new SVDRecommender(
          numFactors,
          learningRate,
          regularization
        );
      
      case 'svd-pca':
        return new SVDPCARecommender(
          numFactors,
          learningRate,
          regularization,
          varianceThreshold
        );
      
      default:
        throw new Error(`Unknown matrix factorization method: ${method}`);
    }
  }

  /**
   * Get available recommendation methods
   * @returns Array of available methods
   */
  static getAvailableMethods(): MatrixFactorizationMethod[] {
    return ['svd', 'svd-pca'];
  }

  /**
   * Get default configuration for a method
   * @param method Recommendation method
   * @returns Default configuration
   */
  static getDefaultConfig(method: MatrixFactorizationMethod): Partial<MatrixFactorizationConfig> {
    const baseConfig = {
      numFactors: 50,
      learningRate: 0.005,
      regularization: 0.02,
      minImprovement: 0.0001,
      maxEpochs: 100
    };

    switch (method) {
      case 'svd':
        return baseConfig;
      
      case 'svd-pca':
        return {
          ...baseConfig,
          varianceThreshold: 0.95
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
  static validateConfig(config: MatrixFactorizationConfig): { 
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

    if (config.numFactors !== undefined && config.numFactors < 1) {
      errors.push('numFactors must be at least 1');
    }

    if (config.learningRate !== undefined && 
        (config.learningRate <= 0 || config.learningRate > 1)) {
      errors.push('learningRate must be between 0 and 1');
    }

    if (config.regularization !== undefined && config.regularization < 0) {
      errors.push('regularization must be non-negative');
    }

    if (config.method === 'svd-pca') {
      if (config.varianceThreshold !== undefined && 
          (config.varianceThreshold <= 0 || config.varianceThreshold > 1)) {
        errors.push('varianceThreshold must be between 0 and 1');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a recommender with validated configuration
   * @param config Configuration for the recommender
   * @returns A MatrixFactorizationRecommender instance
   * @throws Error if configuration is invalid
   */
  static createValidatedRecommender(config: MatrixFactorizationConfig): MatrixFactorizationRecommender {
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
  static getMethodDescription(method: MatrixFactorizationMethod): string {
    switch (method) {
      case 'svd':
        return 'Singular Value Decomposition (SVD) learns latent factors for users and items ' +
               'through matrix factorization. It captures underlying patterns in rating behavior ' +
               'and can handle sparse data well.';
      
      case 'svd-pca':
        return 'SVD with Principal Component Analysis (PCA) adds dimensionality reduction to ' +
               'standard SVD. It identifies the most important latent factors that explain the ' +
               'majority of rating variance, leading to a more compact and potentially more ' +
               'robust model.';
      
      default:
        return 'Unknown matrix factorization method';
    }
  }
}
