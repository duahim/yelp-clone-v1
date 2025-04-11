import { 
  UserSimilarityScore,
  RecommendationResult
} from '../types';
import { CollaborativeFilteringRecommender } from './base';

export class UserBasedCFRecommender extends CollaborativeFilteringRecommender {
  private readonly minSimilarUsers: number;
  private readonly ratingThreshold: number;

  constructor(
    minRatings: number = 1,
    minSimilarUsers: number = 1,
    ratingThreshold: number = 2
  ) {
    super(minRatings);
    this.minSimilarUsers = minSimilarUsers;
    this.ratingThreshold = ratingThreshold;
    this.log(`collaborative filtering: UserBasedCFRecommender created with: minRatings=${minRatings}, minSimilarUsers=${minSimilarUsers}, ratingThreshold=${ratingThreshold}`);
  }

  /**
   * Convert log entries to formatted strings
   */
  private getFormattedLogs(): string[] {
    this.log(`collaborative filtering: Converting ${this.getLogs().length} log entries to formatted strings`);
    return this.getLogs().map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    );
  }

  /**
   * Override the additionalInitialization method to add logging
   */
  protected async additionalInitialization(): Promise<void> {
    this.log(`collaborative filtering: Additional initialization for UserBasedCFRecommender`);
    this.log(`collaborative filtering: User ratings map has ${this.userRatings.size} users`);
    this.log(`collaborative filtering: Item ratings map has ${this.itemRatings.size} items`);
    
    // Log some statistics about the data
    let totalRatings = 0;
    let maxRatingsPerUser = 0;
    let minRatingsPerUser = Infinity;
    
    this.userRatings.forEach((ratings, userId) => {
      totalRatings += ratings.size;
      maxRatingsPerUser = Math.max(maxRatingsPerUser, ratings.size);
      minRatingsPerUser = Math.min(minRatingsPerUser, ratings.size);
    });
    
    const avgRatingsPerUser = totalRatings / this.userRatings.size;
    this.log(`collaborative filtering: Rating statistics: total=${totalRatings}, avg per user=${avgRatingsPerUser.toFixed(2)}, min=${minRatingsPerUser}, max=${maxRatingsPerUser}`);
  }

  /**
   * Predict rating for a user-item pair
   * @param userId User ID
   * @param businessId Business ID
   * @returns Predicted rating
   */
  private predictRating(userId: string, businessId: string): number {
    this.log(`collaborative filtering: Predicting rating for user=${userId}, business=${businessId}`);
    
    const userRatings = this.userRatings.get(userId);
    if (!userRatings) {
      this.log(`collaborative filtering: Cannot predict rating: User ${userId} has no ratings`, 'warning');
      return 0;
    }
    
    this.log(`collaborative filtering: User ${userId} has ${userRatings.size} ratings`);

    // Check if the user has already rated this item (just for logging)
    if (userRatings.has(businessId)) {
      this.log(`collaborative filtering: User ${userId} has already rated business ${businessId} with ${userRatings.get(businessId)}`, 'info');
    }

    // Get similar users who have rated this item
    this.log(`collaborative filtering: Finding similar users for user ${userId} who have rated business ${businessId}`);
    
    // First get all similar users
    const allSimilarUsers = this.getSimilarUsers(userId);
    this.log(`collaborative filtering: Found ${allSimilarUsers.length} similar users for user ${userId}`);
    
    // Then filter to those who have rated this business
    const similarUsers = allSimilarUsers.filter(sim => {
      const otherUserRatings = this.userRatings.get(sim.user_id);
      const hasRated = otherUserRatings && otherUserRatings.has(businessId);
      this.log(`collaborative filtering:   User ${sim.user_id} (similarity: ${sim.score.toFixed(3)}): ${hasRated ? 'has rated' : 'has not rated'} business ${businessId}`);
      return hasRated;
    });

    this.log(`collaborative filtering: Found ${similarUsers.length} similar users who rated business ${businessId}`, 'info');

    if (similarUsers.length < this.minSimilarUsers) {
      this.log(`collaborative filtering: Not enough similar users who rated business ${businessId}: ${similarUsers.length} < ${this.minSimilarUsers} required`, 'info');
      return 0;
    }

    // Calculate weighted average rating
    let weightedSum = 0;
    let similaritySum = 0;

    this.log(`collaborative filtering: Calculating weighted average rating from ${similarUsers.length} similar users:`);
    similarUsers.forEach(sim => {
      const otherUserRatings = this.userRatings.get(sim.user_id)!;
      const rating = otherUserRatings.get(businessId)!;
      weightedSum += sim.score * rating;
      similaritySum += Math.abs(sim.score);
      this.log(`collaborative filtering:   User ${sim.user_id} rated it ${rating} (similarity: ${sim.score.toFixed(3)}, weighted contribution: ${(sim.score * rating).toFixed(3)})`);
    });

    const predictedRating = similaritySum > 0 ? weightedSum / similaritySum : 0;
    this.log(`collaborative filtering: Predicted rating calculation: weightedSum=${weightedSum.toFixed(3)}, similaritySum=${similaritySum.toFixed(3)}`);
    this.log(`collaborative filtering: Predicted rating for business ${businessId}: ${predictedRating.toFixed(3)}`, 'info');
    
    return predictedRating;
  }

  /**
   * Get recommendations for a user
   * @param userId User ID
   * @param topN Number of recommendations to return
   */
  public async getRecommendations(
    userId: string,
    topN: number = 5
  ): Promise<RecommendationResult> {
    this.log(`collaborative filtering: ===== STARTING RECOMMENDATION PROCESS FOR USER ${userId} =====`, 'info');
    this.log(`collaborative filtering: Getting collaborative filtering recommendations for user ${userId} with topN=${topN}`, 'info');

    // Start timing for performance logging
    const startTime = Date.now();

    const userRatings = this.userRatings.get(userId);
    if (!userRatings) {
      this.log(`collaborative filtering: No ratings found for user ${userId}`, 'warning');
      return {
        recommendations: [],
        scores: [],
        explanation: `No ratings found for user ${userId}`,
        method: 'user-based-cf',
        logs: this.getFormattedLogs()
      };
    }

    this.log(`collaborative filtering: User ${userId} has rated ${userRatings.size} items:`, 'info');
    userRatings.forEach((rating, businessId) => {
      this.log(`collaborative filtering:   Business ${businessId}: ${rating}`);
    });

    // Get items the user hasn't rated
    const allItems = Array.from(this.itemRatings.keys());
    this.log(`collaborative filtering: Total items in the system: ${allItems.length}`);
    
    const unratedItems = allItems.filter(itemId => !userRatings.has(itemId));
    this.log(`collaborative filtering: Found ${unratedItems.length} unrated items for user ${userId}`, 'info');
    
    if (unratedItems.length === 0) {
      this.log(`collaborative filtering: User ${userId} has already rated all items in the system`, 'warning');
      return {
        recommendations: [],
        scores: [],
        explanation: `You have already rated all available items`,
        method: 'user-based-cf',
        logs: this.getFormattedLogs()
      };
    }

    // Predict ratings for unrated items
    this.log(`collaborative filtering: Predicting ratings for ${unratedItems.length} unrated items...`, 'info');
    const predictions = [];
    
    for (const itemId of unratedItems) {
      const rating = this.predictRating(userId, itemId);
      if (rating > 0) {
        predictions.push({
          business_id: itemId,
          predicted_rating: rating
        });
      }
    }

    this.log(`collaborative filtering: Generated ${predictions.length} valid predictions out of ${unratedItems.length} unrated items`, 'info');
    
    // Log the distribution of predicted ratings for analysis
    if (predictions.length > 0) {
      const min = Math.min(...predictions.map(p => p.predicted_rating));
      const max = Math.max(...predictions.map(p => p.predicted_rating));
      const avg = predictions.reduce((sum, p) => sum + p.predicted_rating, 0) / predictions.length;
      this.log(`collaborative filtering: Prediction stats: min=${min.toFixed(2)}, max=${max.toFixed(2)}, avg=${avg.toFixed(2)}`);
    }

    // Sort by predicted rating and get top N
    const filteredPredictions = predictions.filter(pred => pred.predicted_rating >= this.ratingThreshold);
    this.log(`collaborative filtering: ${filteredPredictions.length} predictions meet the rating threshold of ${this.ratingThreshold}`);
    
    const topRecommendations = filteredPredictions
      .sort((a, b) => b.predicted_rating - a.predicted_rating)
      .slice(0, topN);

    if (topRecommendations.length === 0) {
      this.log(`collaborative filtering: No recommendations met the minimum rating threshold of ${this.ratingThreshold}`, 'info');
      return {
        recommendations: [],
        scores: [],
        explanation: 'No suitable recommendations found based on user similarities',
        method: 'user-based-cf',
        logs: this.getFormattedLogs()
      };
    }

    this.log(`collaborative filtering: Top ${topRecommendations.length} recommendations:`, 'info');
    topRecommendations.forEach((rec, index) => {
      this.log(`collaborative filtering:   #${index+1}: Business ${rec.business_id} with predicted rating ${rec.predicted_rating.toFixed(3)}`);
    });
    
    // Calculate processing time
    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;
    this.log(`collaborative filtering: Recommendation processing completed in ${processingTime.toFixed(2)} seconds`, 'info');
    
    this.log(`collaborative filtering: ===== RECOMMENDATION PROCESS COMPLETED =====`, 'info');
    
    return {
      recommendations: topRecommendations.map(rec => rec.business_id),
      scores: topRecommendations.map(rec => rec.predicted_rating),
      explanation: `Recommendations based on ratings from ${Math.min(5, this.userRatings.size-1)} users with similar taste profiles`,
      method: 'user-based-cf',
      logs: this.getFormattedLogs()
    };
  }

  /**
   * Get explanation for a recommendation
   * @param userId User ID
   * @param businessId Business ID
   */
  public async getRecommendationExplanation(
    userId: string,
    businessId: string
  ): Promise<string> {
    this.log(`collaborative filtering: Generating explanation for user ${userId}, business ${businessId}`);
    
    // Get similar users who rated this business
    const allSimilarUsers = this.getSimilarUsers(userId);
    this.log(`collaborative filtering: Found ${allSimilarUsers.length} similar users to ${userId}`);
    
    const similarUsers = allSimilarUsers.filter(sim => {
      const otherUserRatings = this.userRatings.get(sim.user_id);
      const hasRated = otherUserRatings && otherUserRatings.has(businessId);
      this.log(`collaborative filtering:   User ${sim.user_id} (similarity: ${sim.score.toFixed(3)}): ${hasRated ? `rated business ${businessId} with ${otherUserRatings?.get(businessId)}` : 'has not rated this business'}`);
      return otherUserRatings && otherUserRatings.has(businessId);
    });

    this.log(`collaborative filtering: Found ${similarUsers.length} similar users who rated business ${businessId}`);

    if (similarUsers.length === 0) {
      this.log(`collaborative filtering: No similar users have rated business ${businessId}`, 'warning');
      return "Not enough similar users have rated this restaurant.";
    }

    // Calculate average rating from similar users
    let totalRating = 0;
    similarUsers.forEach(sim => {
      const otherUserRatings = this.userRatings.get(sim.user_id)!;
      const rating = otherUserRatings.get(businessId)!;
      totalRating += rating;
      this.log(`collaborative filtering:   User ${sim.user_id} rated it ${rating}`);
    });
    const averageRating = totalRating / similarUsers.length;
    this.log(`collaborative filtering: Average rating from similar users: ${averageRating.toFixed(2)}`);

    // Get some highly rated items that similar users also like
    this.log(`collaborative filtering: Looking for other highly rated items from similar users`);
    const otherHighlyRated = new Map<string, number>(); // business_id -> count
    similarUsers.forEach(sim => {
      const otherUserRatings = this.userRatings.get(sim.user_id)!;
      let highlyRatedCount = 0;
      
      otherUserRatings.forEach((rating, itemId) => {
        if (rating >= 4 && itemId !== businessId) {
          otherHighlyRated.set(itemId, (otherHighlyRated.get(itemId) || 0) + 1);
          highlyRatedCount++;
        }
      });
      
      this.log(`collaborative filtering:   User ${sim.user_id} has ${highlyRatedCount} highly rated items (4+ stars)`);
    });

    const commonHighlyRated = Array.from(otherHighlyRated.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([itemId, count]) => {
        this.log(`collaborative filtering:   Business ${itemId} is highly rated by ${count} similar users`);
        return itemId;
      });

    this.log(`collaborative filtering: Found ${commonHighlyRated.length} commonly highly-rated businesses among similar users`);

    let explanation = `This restaurant is recommended because ${similarUsers.length} users with similar taste `;
    explanation += `gave it an average rating of ${averageRating.toFixed(1)} out of 5. `;

    if (commonHighlyRated.length > 0) {
      explanation += "These users also highly rated other restaurants that you might enjoy.";
    }

    this.log(`collaborative filtering: Generated explanation: "${explanation}"`);
    return explanation;
  }
}
