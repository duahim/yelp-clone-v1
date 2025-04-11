export * from './base';
export * from './svd';
export * from './svd-pca';
export * from './factory';

/**
 * Level 3: Matrix Factorization
 * 
 * This module implements matrix factorization-based recommendation algorithms
 * that learn latent factors to represent users and items in a lower-dimensional
 * space. It includes:
 * 
 * 1. Singular Value Decomposition (SVD)
 *    - Learns latent factors through gradient descent
 *    - Includes bias terms for users and items
 *    - Handles sparse rating matrices efficiently
 * 
 * 2. SVD with Principal Component Analysis (PCA)
 *    - Extends SVD with dimensionality reduction
 *    - Identifies most important latent factors
 *    - Reduces model complexity while maintaining performance
 * 
 * Usage example:
 * ```typescript
 * import { MatrixFactorizationFactory } from './factory';
 * 
 * // Create a recommender
 * const recommender = MatrixFactorizationFactory.createRecommender({
 *   method: 'svd-pca',
 *   numFactors: 50,
 *   learningRate: 0.005,
 *   regularization: 0.02,
 *   varianceThreshold: 0.95
 * });
 * 
 * // Train the model
 * await recommender.train(ratings, 100);
 * 
 * // Get recommendations
 * const recommendations = await recommender.getRecommendations(userId, 5);
 * 
 * // Save/load model
 * const model = recommender.getModel();
 * recommender.loadModel(model);
 * ```
 * 
 * Key Features:
 * - Configurable hyperparameters (learning rate, regularization, etc.)
 * - Early stopping based on RMSE improvement
 * - Bias terms to capture user and item rating tendencies
 * - PCA for automatic feature selection
 * - Model persistence support
 * - Detailed logging and explanations
 * 
 * Both methods extend the base MatrixFactorizationRecommender class and
 * implement their own versions of training and prediction logic.
 */

// Re-export types that are specific to matrix factorization
export type { 
  Rating,
  MatrixFactorizationModel,
  RecommendationResult
} from '../types';

// Export factory types
export type { MatrixFactorizationMethod } from './factory';

// Export common utilities
export { calculateCosineSimilarity } from '../utils/similarity';

// Export constants
export const DEFAULT_NUM_FACTORS = 50;
export const DEFAULT_LEARNING_RATE = 0.005;
export const DEFAULT_REGULARIZATION = 0.02;
export const DEFAULT_MIN_IMPROVEMENT = 0.0001;
export const DEFAULT_MAX_EPOCHS = 100;
export const DEFAULT_VARIANCE_THRESHOLD = 0.95;

// Export error messages
export const ERRORS = {
  INVALID_CONFIG: 'Invalid configuration provided',
  NO_TRAINING_DATA: 'No training data available',
  INVALID_USER: 'User not found in training data',
  INVALID_ITEM: 'Item not found in training data',
  TRAINING_FAILED: 'Model training failed',
  INVALID_MODEL: 'Invalid model format for loading',
  DIMENSION_MISMATCH: 'Model dimensions do not match configuration',
} as const;

// Export metric names
export const METRICS = {
  RMSE: 'Root Mean Square Error',
  MAE: 'Mean Absolute Error',
  EXPLAINED_VARIANCE: 'Explained Variance Ratio',
  TRAINING_TIME: 'Training Time (seconds)',
  NUM_EPOCHS: 'Number of Epochs',
  NUM_FACTORS: 'Number of Latent Factors',
} as const;
