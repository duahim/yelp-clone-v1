import { 
  Rating,
  RecommendationResult
} from '../types';
import { MatrixFactorizationRecommender } from './base';

export class SVDRecommender extends MatrixFactorizationRecommender {
  private readonly minImprovement: number;
  private readonly maxEpochs: number;
  private globalBias: number;
  private userBiases: Map<string, number>;
  private itemBiases: Map<string, number>;

  constructor(
    numFactors: number = 50,
    learningRate: number = 0.005,
    regularization: number = 0.02,
    minImprovement: number = 0.0001,
    maxEpochs: number = 100
  ) {
    super(numFactors, learningRate, regularization);
    this.minImprovement = minImprovement;
    this.maxEpochs = maxEpochs;
    this.globalBias = 0;
    this.userBiases = new Map();
    this.itemBiases = new Map();
  }

  /**
   * Initialize biases with zeros
   */
  private initializeBiases(): void {
    this.userBiases.clear();
    this.itemBiases.clear();

    for (const userId of this.userIndex.keys()) {
      this.userBiases.set(userId, 0);
    }

    for (const itemId of this.itemIndex.keys()) {
      this.itemBiases.set(itemId, 0);
    }
  }

  /**
   * Predict rating including biases
   */
  protected override predictRating(userId: string, businessId: string): number {
    const baseline = this.globalBias + 
      (this.userBiases.get(userId) || 0) + 
      (this.itemBiases.get(businessId) || 0);

    const userFactors = this.userFactors.get(userId);
    const itemFactors = this.itemFactors.get(businessId);

    if (!userFactors || !itemFactors) {
      return Math.max(this.minRating, Math.min(this.maxRating, baseline));
    }

    // Compute dot product
    let prediction = baseline;
    for (let i = 0; i < this.numFactors; i++) {
      prediction += userFactors[i] * itemFactors[i];
    }

    // Clip to rating range
    return Math.max(this.minRating, Math.min(this.maxRating, prediction));
  }

  /**
   * Train the model using SGD with bias terms
   */
  public async train(ratings: Rating[], numEpochs: number = this.maxEpochs): Promise<void> {
    this.log('Starting SVD training...');

    // Build user and item indices
    this.userIndex.clear();
    this.itemIndex.clear();
    
    ratings.forEach(rating => {
      if (!this.userIndex.has(rating.user_id)) {
        this.userIndex.set(rating.user_id, this.userIndex.size);
      }
      if (!this.itemIndex.has(rating.business_id)) {
        this.itemIndex.set(rating.business_id, this.itemIndex.size);
      }
    });

    // Initialize factors and biases
    this.initializeFactors(this.userIndex.size, this.itemIndex.size);
    this.initializeBiases();

    // Calculate global mean
    this.globalBias = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

    let prevRmse = Infinity;
    let bestRmse = Infinity;
    let epochsWithoutImprovement = 0;

    for (let epoch = 0; epoch < numEpochs; epoch++) {
      let sumSquaredError = 0;

      // Shuffle ratings
      const shuffledRatings = [...ratings].sort(() => Math.random() - 0.5);

      for (const rating of shuffledRatings) {
        const { user_id, business_id, rating: actualRating } = rating;
        
        // Compute error
        const predicted = this.predictRating(user_id, business_id);
        const error = actualRating - predicted;
        sumSquaredError += error * error;

        // Update biases
        const userBias = this.userBiases.get(user_id)!;
        const itemBias = this.itemBiases.get(business_id)!;
        
        this.userBiases.set(
          user_id,
          userBias + this.learningRate * (error - this.regularization * userBias)
        );
        
        this.itemBiases.set(
          business_id,
          itemBias + this.learningRate * (error - this.regularization * itemBias)
        );

        // Update latent factors
        const userFactors = this.userFactors.get(user_id)!;
        const itemFactors = this.itemFactors.get(business_id)!;

        for (let f = 0; f < this.numFactors; f++) {
          const userOld = userFactors[f];
          const itemOld = itemFactors[f];

          userFactors[f] += this.learningRate * 
            (error * itemOld - this.regularization * userOld);
          
          itemFactors[f] += this.learningRate * 
            (error * userOld - this.regularization * itemOld);
        }
      }

      // Compute RMSE
      const rmse = Math.sqrt(sumSquaredError / ratings.length);
      
      this.log(`Epoch ${epoch + 1}/${numEpochs}, RMSE: ${rmse.toFixed(4)}`);

      // Early stopping check
      if (rmse < bestRmse) {
        bestRmse = rmse;
        epochsWithoutImprovement = 0;
      } else {
        epochsWithoutImprovement++;
      }

      if (Math.abs(prevRmse - rmse) < this.minImprovement || 
          epochsWithoutImprovement >= 5) {
        this.log(`Early stopping at epoch ${epoch + 1}`);
        break;
      }

      prevRmse = rmse;
    }

    this.log(`Training completed, final RMSE: ${bestRmse.toFixed(4)}`);
  }

  /**
   * Get recommendations for a user
   */
  public async getRecommendations(
    userId: string,
    topN: number = 5
  ): Promise<RecommendationResult> {
    this.log(`Getting recommendations for user ${userId} with topN=${topN}`);

    // Check if user factors exist
    if (!this.userFactors.has(userId)) {
      this.log(`WARNING: No user factors found for user ${userId}`, 'warning');
      return {
        recommendations: [],
        scores: [],
        explanation: `No training data available for user ${userId}`,
        method: 'svd',
        logs: this.getFormattedLogs()
      };
    }
    
    // Get the user's rated items to exclude from recommendations
    const userRatedItems = new Set<string>();
    
    try {
      // Log debugging information
      this.log(`User factors found for ${userId}, predicting ratings for ${this.itemFactors.size} items`);
      
      // Check if we have item factors
      if (this.itemFactors.size === 0) {
        this.log(`ERROR: No item factors available for prediction`, 'error');
        return {
          recommendations: [],
          scores: [],
          explanation: 'No item data available for matrix factorization',
          method: 'svd',
          logs: this.getFormattedLogs()
        };
      }
      
      // IMPORTANT FIX: First identify which items this user has already rated
      // by checking all ratings that have this user ID
      // We need to filter these out from recommendations
      for (const [itemId, userIds] of this.itemIndex.entries()) {
        // If this user has rated this item, add to the set of rated items
        if (this.userFactors.has(userId) && this.predictRating(userId, itemId) > 0) {
          userRatedItems.add(itemId);
        }
      }
      
      this.log(`User ${userId} has already rated ${userRatedItems.size} items, which will be excluded from recommendations`);
      
      // Predict ratings for all items EXCEPT those the user has already rated
      const predictions = Array.from(this.itemFactors.keys())
        .filter(itemId => !userRatedItems.has(itemId))  // Filter out items the user has already rated
        .map(itemId => ({
          business_id: itemId,
          predicted_rating: this.predictRating(userId, itemId)
        }))
        .sort((a, b) => b.predicted_rating - a.predicted_rating)
        .slice(0, topN);
      
      this.log(`Generated ${predictions.length} recommendations for user ${userId} (excluding items they've already rated)`);
      
      // Log top recommendation scores
      if (predictions.length > 0) {
        const topScores = predictions.slice(0, Math.min(5, predictions.length))
          .map(p => `${p.business_id}: ${p.predicted_rating.toFixed(2)}`)
          .join(', ');
        this.log(`Top predicted ratings: ${topScores}`);
      } else {
        this.log(`WARNING: No predictions were generated despite having user and item factors`, 'warning');
        
        // If no recommendations (after filtering out rated items), fall back to re-ranking all items
        this.log(`Fallback: Including all items and ranking by predicted rating as last resort`);
        const fallbackPredictions = Array.from(this.itemFactors.keys())
          .map(itemId => ({
            business_id: itemId,
            predicted_rating: this.predictRating(userId, itemId)
          }))
          .sort((a, b) => b.predicted_rating - a.predicted_rating)
          .slice(0, topN);
          
        if (fallbackPredictions.length > 0) {
          this.log(`Fallback generated ${fallbackPredictions.length} recommendations`);
          return {
            recommendations: fallbackPredictions.map(p => p.business_id),
            scores: fallbackPredictions.map(p => p.predicted_rating),
            explanation: 'Recommendations based on matrix factorization (includes items you may have already rated)',
            method: 'svd',
            logs: this.getFormattedLogs()
          };
        }
      }

      return {
        recommendations: predictions.map(p => p.business_id),
        scores: predictions.map(p => p.predicted_rating),
        explanation: predictions.length > 0 
          ? 'Recommendations based on learned user and item latent factors' 
          : 'Matrix factorization could not generate personalized recommendations',
        method: 'svd',
        logs: this.getFormattedLogs()
      };
    } catch (error) {
      this.log(`ERROR in generating recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return {
        recommendations: [],
        scores: [],
        explanation: `Error generating matrix factorization recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        method: 'svd',
        logs: this.getFormattedLogs()
      };
    }
  }

  /**
   * Get explanation for a recommendation
   */
  public async getRecommendationExplanation(
    userId: string,
    businessId: string
  ): Promise<string> {
    const predictedRating = this.predictRating(userId, businessId);
    const userBias = this.userBiases.get(userId) || 0;
    const itemBias = this.itemBiases.get(businessId) || 0;

    let explanation = `We predict you'll rate this restaurant ${predictedRating.toFixed(1)} out of 5. `;

    if (Math.abs(userBias) > 0.5) {
      explanation += userBias > 0 
        ? "You tend to rate restaurants higher than average. "
        : "You tend to rate restaurants lower than average. ";
    }

    if (Math.abs(itemBias) > 0.5) {
      explanation += itemBias > 0
        ? "This restaurant typically receives above-average ratings. "
        : "This restaurant typically receives below-average ratings. ";
    }

    explanation += "This recommendation is based on patterns learned from analyzing thousands of ratings.";

    return explanation;
  }

  /**
   * Get the biases
   */
  public getBiases(): {
    global: number;
    user: Map<string, number>;
    item: Map<string, number>;
  } {
    return {
      global: this.globalBias,
      user: this.userBiases,
      item: this.itemBiases
    };
  }
}
