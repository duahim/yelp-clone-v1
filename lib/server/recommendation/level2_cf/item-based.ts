import { 
  ItemSimilarityScore,
  RecommendationResult
} from '../types';
import { CollaborativeFilteringRecommender } from './base';

export class ItemBasedCFRecommender extends CollaborativeFilteringRecommender {
  private readonly minSimilarItems: number;
  private readonly ratingThreshold: number;
  private similarityCache: Map<string, Map<string, number>>;

  constructor(
    minRatings: number = 1,
    minSimilarItems: number = 1,
    ratingThreshold: number = 2
  ) {
    super(minRatings);
    this.minSimilarItems = minSimilarItems;
    this.ratingThreshold = ratingThreshold;
    this.similarityCache = new Map();
  }

  /**
   * Convert log entries to formatted strings
   */
  private getFormattedLogs(): string[] {
    return this.getLogs().map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    );
  }

  /**
   * Initialize similarity cache for faster recommendations
   */
  protected async additionalInitialization(): Promise<void> {
    this.log('Building item similarity cache...');
    
    const allItems = Array.from(this.itemRatings.keys());
    
    // Pre-compute similarities between all items
    for (let i = 0; i < allItems.length; i++) {
      const itemId = allItems[i];
      if (!this.similarityCache.has(itemId)) {
        this.similarityCache.set(itemId, new Map());
      }
      
      for (let j = i + 1; j < allItems.length; j++) {
        const otherId = allItems[j];
        const similarity = this.calculateSimilarity(itemId, otherId, 'item');
        
        // Store similarity in both directions
        this.similarityCache.get(itemId)!.set(otherId, similarity);
        
        if (!this.similarityCache.has(otherId)) {
          this.similarityCache.set(otherId, new Map());
        }
        this.similarityCache.get(otherId)!.set(itemId, similarity);
      }
    }
    
    this.log('Item similarity cache built successfully');
  }

  /**
   * Get cached similarity between two items
   */
  private getCachedSimilarity(itemId1: string, itemId2: string): number {
    const cache = this.similarityCache.get(itemId1);
    if (!cache) return 0;
    return cache.get(itemId2) || 0;
  }

  /**
   * Predict rating for a user-item pair
   * @param userId User ID
   * @param businessId Business ID
   * @returns Predicted rating
   */
  private predictRating(userId: string, businessId: string): number {
    const userRatings = this.userRatings.get(userId);
    if (!userRatings) {
      return 0;
    }

    // Get items the user has rated
    const ratedItems = Array.from(userRatings.entries());
    if (ratedItems.length === 0) {
      return 0;
    }

    // Calculate weighted average based on item similarities
    let weightedSum = 0;
    let similaritySum = 0;

    ratedItems.forEach(([ratedItemId, rating]) => {
      const similarity = this.getCachedSimilarity(businessId, ratedItemId);
      if (similarity > 0) {
        weightedSum += similarity * rating;
        similaritySum += Math.abs(similarity);
      }
    });

    return similaritySum > 0 ? weightedSum / similaritySum : 0;
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
    this.log(`Getting recommendations for user ${userId}`);

    const userRatings = this.userRatings.get(userId);
    if (!userRatings) {
      return {
        recommendations: [],
        scores: [],
        explanation: `No ratings found for user ${userId}`,
        method: 'item-based-cf',
        logs: this.getFormattedLogs()
      };
    }

    // Get items the user hasn't rated
    const unratedItems = Array.from(this.itemRatings.keys())
      .filter(itemId => !userRatings.has(itemId));

    // Predict ratings for unrated items
    const predictions = unratedItems.map(itemId => ({
      business_id: itemId,
      predicted_rating: this.predictRating(userId, itemId)
    }));

    // Sort by predicted rating and get top N
    const topRecommendations = predictions
      .filter(pred => pred.predicted_rating >= this.ratingThreshold)
      .sort((a, b) => b.predicted_rating - a.predicted_rating)
      .slice(0, topN);

    if (topRecommendations.length === 0) {
      return {
        recommendations: [],
        scores: [],
        explanation: 'No suitable recommendations found based on item similarities',
        method: 'item-based-cf',
        logs: this.getFormattedLogs()
      };
    }

    return {
      recommendations: topRecommendations.map(rec => rec.business_id),
      scores: topRecommendations.map(rec => rec.predicted_rating),
      explanation: `Recommendations based on restaurants similar to ones you've rated highly`,
      method: 'item-based-cf',
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
    const userRatings = this.userRatings.get(userId);
    if (!userRatings) {
      return "No rating history found for this user.";
    }

    // Find most similar items that the user has rated highly
    const similarRatedItems = Array.from(userRatings.entries())
      .map(([itemId, rating]) => ({
        business_id: itemId,
        rating,
        similarity: this.getCachedSimilarity(businessId, itemId)
      }))
      .filter(item => item.similarity > 0 && item.rating >= 4)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 2);

    if (similarRatedItems.length === 0) {
      return "This restaurant is recommended based on its overall similarity patterns with other restaurants.";
    }

    const predictedRating = this.predictRating(userId, businessId);
    let explanation = `We think you'll rate this restaurant around ${predictedRating.toFixed(1)} out of 5 `;
    explanation += `because it's similar to other restaurants you've rated highly. `;

    if (similarRatedItems.length > 0) {
      explanation += `For example, it shares characteristics with restaurants you've enjoyed in the past.`;
    }

    return explanation;
  }

  /**
   * Get the similarity cache size
   */
  public getCacheSize(): number {
    let size = 0;
    this.similarityCache.forEach(cache => {
      size += cache.size;
    });
    return size;
  }

  /**
   * Clear the similarity cache
   */
  public clearCache(): void {
    this.similarityCache.clear();
    this.log('Similarity cache cleared');
  }
}
