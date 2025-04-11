import { 
  Rating,
  Restaurant,
  Review,
  RecommendationResult,
  LogEntry,
  HybridWeights
} from '../types';
import { ContentBasedRecommender } from '../level1_content/base';
import { CollaborativeFilteringRecommender } from '../level2_cf/base';
import { MatrixFactorizationRecommender } from '../level3_matrix/base';

export abstract class HybridRecommender {
  protected contentRecommender: ContentBasedRecommender | null;
  protected collaborativeRecommender: CollaborativeFilteringRecommender | null;
  protected matrixRecommender: MatrixFactorizationRecommender | null;
  protected weights: HybridWeights;
  protected logs: LogEntry[];

  constructor(weights: HybridWeights) {
    this.contentRecommender = null;
    this.collaborativeRecommender = null;
    this.matrixRecommender = null;
    this.weights = weights;
    this.logs = [];

    // Normalize weights to sum to 1
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (sum > 0) {
      Object.keys(weights).forEach(key => {
        this.weights[key as keyof HybridWeights] /= sum;
      });
    }
  }

  protected log(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    this.logs.push({ timestamp, message, level });
  }

  /**
   * Convert log entries to formatted strings
   */
  protected getFormattedLogs(): string[] {
    return this.getLogs().map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    );
  }

  /**
   * Set the content-based recommender
   */
  public setContentRecommender(recommender: ContentBasedRecommender): void {
    this.contentRecommender = recommender;
    this.log('Content-based recommender set');
  }

  /**
   * Set the collaborative filtering recommender
   */
  public setCollaborativeRecommender(recommender: CollaborativeFilteringRecommender): void {
    this.collaborativeRecommender = recommender;
    this.log('Collaborative filtering recommender set');
  }

  /**
   * Set the matrix factorization recommender
   */
  public setMatrixRecommender(recommender: MatrixFactorizationRecommender): void {
    this.matrixRecommender = recommender;
    this.log('Matrix factorization recommender set');
  }

  /**
   * Initialize all recommenders
   */
  public async initialize(
    restaurants: Restaurant[],
    reviews: Review[],
    ratings: Rating[]
  ): Promise<void> {
    this.log('Initializing hybrid recommender...');

    try {
      // Initialize content-based recommender if available
      if (this.contentRecommender && this.weights.content_based > 0) {
        await this.contentRecommender.buildItemProfiles(restaurants, reviews);
        this.log('Content-based recommender initialized');
      }

      // Initialize collaborative filtering recommender if available
      if (this.collaborativeRecommender && this.weights.collaborative > 0) {
        await this.collaborativeRecommender.initialize(ratings);
        this.log('Collaborative filtering recommender initialized');
      }

      // Initialize and train matrix factorization recommender if available
      if (this.matrixRecommender && this.weights.matrix_factorization && 
          this.weights.matrix_factorization > 0) {
        await this.matrixRecommender.train(ratings);
        this.log('Matrix factorization recommender initialized');
      }

      this.log('Hybrid recommender initialization complete');
    } catch (error) {
      this.log(`Initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }

  /**
   * Get recommendations using the hybrid approach
   * @param userId User ID
   * @param topN Number of recommendations to return
   */
  public abstract getRecommendations(
    userId: string,
    topN?: number
  ): Promise<RecommendationResult>;

  /**
   * Get explanation for a recommendation
   * @param userId User ID
   * @param businessId Business ID
   */
  public abstract getRecommendationExplanation(
    userId: string,
    businessId: string
  ): Promise<string>;

  /**
   * Get the current weights
   */
  public getWeights(): HybridWeights {
    return { ...this.weights };
  }

  /**
   * Update the weights
   * @param newWeights New weights to use
   */
  public updateWeights(newWeights: Partial<HybridWeights>): void {
    // Update provided weights
    Object.assign(this.weights, newWeights);

    // Normalize weights to sum to 1
    const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (sum > 0) {
      Object.keys(this.weights).forEach(key => {
        this.weights[key as keyof HybridWeights] /= sum;
      });
    }

    this.log('Weights updated and normalized');
  }

  /**
   * Get the logs
   */
  public getLogs(): LogEntry[] {
    return this.logs;
  }

  /**
   * Clear the logs
   */
  public clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get statistics about the hybrid recommender
   */
  public getStats(): {
    activeRecommenders: string[];
    weights: HybridWeights;
    contentStats?: any;
    collaborativeStats?: any;
    matrixStats?: any;
  } {
    const stats: any = {
      activeRecommenders: [],
      weights: this.weights
    };

    if (this.contentRecommender && this.weights.content_based > 0) {
      stats.activeRecommenders.push('content-based');
      // Content-based recommenders don't have standard stats
    }

    if (this.collaborativeRecommender && this.weights.collaborative > 0) {
      stats.activeRecommenders.push('collaborative');
      stats.collaborativeStats = this.collaborativeRecommender.getStats();
    }

    if (this.matrixRecommender && this.weights.matrix_factorization && 
        this.weights.matrix_factorization > 0) {
      stats.activeRecommenders.push('matrix-factorization');
      stats.matrixStats = this.matrixRecommender.getStats();
    }

    return stats;
  }
}
