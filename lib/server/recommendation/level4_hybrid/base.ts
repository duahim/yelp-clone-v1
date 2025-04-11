import { 
  Rating,
  Restaurant,
  Review,
  RecommendationResult,
  LogEntry,
  HybridWeights,
  HybridStats
} from '../types';
import { ContentBasedRecommender } from '../level1_content/base';
import { CollaborativeFilteringRecommender } from '../level2_cf/base';
import { MatrixFactorizationRecommender } from '../level3_matrix/base';
import { DEFAULT_MIN_RATING, DEFAULT_MAX_RATING, ERRORS, utils } from './index';

export abstract class HybridRecommender {
  protected contentRecommender: ContentBasedRecommender | null;
  protected collaborativeRecommender: CollaborativeFilteringRecommender | null;
  protected matrixRecommender: MatrixFactorizationRecommender | null;
  protected weights: HybridWeights;
  protected logs: LogEntry[];
  protected readonly minRating: number;
  protected readonly maxRating: number;

  constructor(
    weights: HybridWeights,
    minRating: number = DEFAULT_MIN_RATING,
    maxRating: number = DEFAULT_MAX_RATING
  ) {
    this.contentRecommender = null;
    this.collaborativeRecommender = null;
    this.matrixRecommender = null;
    this.weights = utils.normalizeWeights(weights);
    this.logs = [];
    this.minRating = minRating;
    this.maxRating = maxRating;

    // Validate weights
    const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.0001) {
      throw new Error(ERRORS.INVALID_WEIGHTS);
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
   * Validate rating is within valid range
   */
  protected validateRating(rating: number): void {
    utils.validateRating(rating, this.minRating, this.maxRating);
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

    // Validate ratings
    ratings.forEach(rating => this.validateRating(rating.rating));

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
    this.weights = utils.normalizeWeights(this.weights);

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
  public getStats(): HybridStats {
    const stats: HybridStats = {
      activeRecommenders: [],
      weights: this.weights
    };

    if (this.contentRecommender && this.weights.content_based > 0) {
      stats.activeRecommenders.push('content-based');
      // Content-based recommender stats are optional
      try {
        const contentStats = (this.contentRecommender as any).getStats?.();
        if (contentStats) {
          stats.contentStats = {
            numProfiles: contentStats.numProfiles || 0,
            avgProfileSize: contentStats.avgProfileSize || 0
          };
        }
      } catch (error) {
        this.log('Failed to get content-based recommender stats', 'warning');
      }
    }

    if (this.collaborativeRecommender && this.weights.collaborative > 0) {
      stats.activeRecommenders.push('collaborative');
      const cfStats = this.collaborativeRecommender.getStats();
      stats.collaborativeStats = {
        numUsers: cfStats.numUsers,
        numItems: cfStats.numItems,
        sparsity: cfStats.sparsity
      };
    }

    if (this.matrixRecommender && this.weights.matrix_factorization && 
        this.weights.matrix_factorization > 0) {
      stats.activeRecommenders.push('matrix-factorization');
      const mfStats = this.matrixRecommender.getStats();
      stats.matrixStats = {
        numUsers: mfStats.numUsers,
        numItems: mfStats.numItems,
        numFactors: mfStats.numFactors,
        sparsity: mfStats.sparsity
      };
    }

    return stats;
  }
}
