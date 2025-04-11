import { ContentBasedRecommender } from './base';
import { TfIdfRecommender } from './tf-idf';
import { LSARecommender } from './lsa';
import { SentenceTransformerRecommender } from './sentence-transformer';

export type RecommenderMethod = 'tfidf' | 'lsa' | 'sentence-transformer';

interface RecommenderConfig {
  method: RecommenderMethod;
  numFeatures?: number;
  apiEndpoint?: string;
  modelName?: string;
}

export class ContentBasedRecommenderFactory {
  /**
   * Create a new recommender instance based on the specified method
   * @param config Configuration for the recommender
   * @returns A ContentBasedRecommender instance
   */
  static createRecommender(config: RecommenderConfig): ContentBasedRecommender {
    const { method, numFeatures = 50 } = config;

    switch (method) {
      case 'tfidf':
        return new TfIdfRecommender(numFeatures);
      
      case 'lsa':
        return new LSARecommender(numFeatures);
      
      case 'sentence-transformer':
        return new SentenceTransformerRecommender(
          config.apiEndpoint,
          config.modelName,
          32 // default batch size
        );
      
      default:
        throw new Error(`Unknown recommender method: ${method}`);
    }
  }

  /**
   * Get available recommendation methods
   * @returns Array of available methods
   */
  static getAvailableMethods(): RecommenderMethod[] {
    return ['tfidf', 'lsa', 'sentence-transformer'];
  }

  /**
   * Get default configuration for a method
   * @param method Recommendation method
   * @returns Default configuration
   */
  static getDefaultConfig(method: RecommenderMethod): Partial<RecommenderConfig> {
    switch (method) {
      case 'tfidf':
        return {
          numFeatures: 50
        };
      
      case 'lsa':
        return {
          numFeatures: 50
        };
      
      case 'sentence-transformer':
        return {
          modelName: 'all-MiniLM-L6-v2',
          apiEndpoint: process.env.SENTENCE_TRANSFORMER_API || 'http://localhost:8080/embed'
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
  static validateConfig(config: RecommenderConfig): { 
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

    switch (config.method) {
      case 'tfidf':
      case 'lsa':
        if (config.numFeatures && config.numFeatures <= 0) {
          errors.push('numFeatures must be positive');
        }
        break;

      case 'sentence-transformer':
        if (config.apiEndpoint && !config.apiEndpoint.startsWith('http')) {
          errors.push('Invalid API endpoint URL');
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
   * @returns A ContentBasedRecommender instance
   * @throws Error if configuration is invalid
   */
  static createValidatedRecommender(config: RecommenderConfig): ContentBasedRecommender {
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
  static getMethodDescription(method: RecommenderMethod): string {
    switch (method) {
      case 'tfidf':
        return 'TF-IDF based recommendation uses term frequency and inverse document frequency ' +
               'to identify important words in restaurant reviews. It works well for finding ' +
               'restaurants with similar vocabulary in their reviews.';
      
      case 'lsa':
        return 'Latent Semantic Analysis (LSA) discovers latent concepts in reviews using ' +
               'singular value decomposition. It can find restaurants that are similar in ' +
               'meaning even when they use different words.';
      
      case 'sentence-transformer':
        return 'Sentence Transformers use modern neural networks to create semantic embeddings ' +
               'of review text. This method is best at understanding the deeper meaning and ' +
               'context of reviews, but requires more computational resources.';
      
      default:
        return 'Unknown recommendation method';
    }
  }
}
