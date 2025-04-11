import { 
  Rating,
  MatrixFactorizationModel,
  RecommendationResult,
  LogEntry
} from '../types';

export abstract class MatrixFactorizationRecommender {
  protected userFactors: Map<string, number[]>;  // user_id -> latent factors
  protected itemFactors: Map<string, number[]>;  // business_id -> latent factors
  protected userIndex: Map<string, number>;      // user_id -> matrix index
  protected itemIndex: Map<string, number>;      // business_id -> matrix index
  protected logs: LogEntry[];
  protected readonly numFactors: number;
  protected readonly learningRate: number;
  protected readonly regularization: number;
  protected readonly minRating: number;
  protected readonly maxRating: number;

  constructor(
    numFactors: number = 50,
    learningRate: number = 0.005,
    regularization: number = 0.02,
    minRating: number = 1,
    maxRating: number = 5
  ) {
    this.numFactors = numFactors;
    this.learningRate = learningRate;
    this.regularization = regularization;
    this.minRating = minRating;
    this.maxRating = maxRating;
    this.userFactors = new Map();
    this.itemFactors = new Map();
    this.userIndex = new Map();
    this.itemIndex = new Map();
    this.logs = [];
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
   * Initialize matrices with random values
   * @param numUsers Number of users
   * @param numItems Number of items
   */
  protected initializeFactors(numUsers: number, numItems: number): void {
    // Initialize user factors
    for (let i = 0; i < numUsers; i++) {
      const factors = new Array(this.numFactors);
      for (let j = 0; j < this.numFactors; j++) {
        factors[j] = Math.random() * 0.1;  // Small random values
      }
      this.userFactors.set(this.getUserId(i), factors);
    }

    // Initialize item factors
    for (let i = 0; i < numItems; i++) {
      const factors = new Array(this.numFactors);
      for (let j = 0; j < this.numFactors; j++) {
        factors[j] = Math.random() * 0.1;  // Small random values
      }
      this.itemFactors.set(this.getItemId(i), factors);
    }
  }

  /**
   * Get user ID from matrix index
   */
  protected getUserId(index: number): string {
    for (const [id, idx] of this.userIndex.entries()) {
      if (idx === index) return id;
    }
    throw new Error(`No user found for index ${index}`);
  }

  /**
   * Get item ID from matrix index
   */
  protected getItemId(index: number): string {
    for (const [id, idx] of this.itemIndex.entries()) {
      if (idx === index) return id;
    }
    throw new Error(`No item found for index ${index}`);
  }

  /**
   * Predict rating for a user-item pair
   * @param userId User ID
   * @param businessId Business ID
   * @returns Predicted rating
   */
  protected predictRating(userId: string, businessId: string): number {
    const userFactors = this.userFactors.get(userId);
    const itemFactors = this.itemFactors.get(businessId);

    if (!userFactors || !itemFactors) {
      return (this.minRating + this.maxRating) / 2;  // Default to middle rating
    }

    // Compute dot product
    let prediction = 0;
    for (let i = 0; i < this.numFactors; i++) {
      prediction += userFactors[i] * itemFactors[i];
    }

    // Clip to rating range
    return Math.max(this.minRating, Math.min(this.maxRating, prediction));
  }

  /**
   * Train the model on rating data
   * @param ratings Array of rating objects
   * @param numEpochs Number of training epochs
   */
  public abstract train(ratings: Rating[], numEpochs?: number): Promise<void>;

  /**
   * Get recommendations for a user
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
   * Get the current model state
   */
  public getModel(): MatrixFactorizationModel {
    return {
      userFactors: Array.from(this.userFactors.values()),
      itemFactors: Array.from(this.itemFactors.values())
    };
  }

  /**
   * Load a pre-trained model
   * @param model Matrix factorization model
   */
  public loadModel(model: MatrixFactorizationModel): void {
    // Reset current factors
    this.userFactors.clear();
    this.itemFactors.clear();

    // Load user factors
    model.userFactors.forEach((factors, i) => {
      this.userFactors.set(this.getUserId(i), factors);
    });

    // Load item factors
    model.itemFactors.forEach((factors, i) => {
      this.itemFactors.set(this.getItemId(i), factors);
    });

    this.log('Loaded pre-trained model');
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
   * Get model statistics
   */
  public getStats(): {
    numUsers: number;
    numItems: number;
    numFactors: number;
    sparsity: number;
  } {
    return {
      numUsers: this.userFactors.size,
      numItems: this.itemFactors.size,
      numFactors: this.numFactors,
      sparsity: 1 - (this.userFactors.size * this.itemFactors.size) / 
        (this.userIndex.size * this.itemIndex.size)
    };
  }

  /**
   * Get user factors for similarity calculations
   * This is used by the similar-users API to find users with similar taste profiles
   */
  public getUserFactors(): Map<string, number[]> {
    return this.userFactors;
  }
}
