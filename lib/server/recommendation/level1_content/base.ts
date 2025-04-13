import { 
  Restaurant, 
  Review, 
  ItemProfile, 
  SimilarityScore,
  RecommendationResult,
  LogEntry
} from '../types';
import { calculateCosineSimilarity } from '../utils/similarity';

export class ContentBasedRecommender {
  protected itemProfiles: Map<string, ItemProfile>;
  protected logs: LogEntry[];

  constructor() {
    this.itemProfiles = new Map();
    this.logs = [];
  }

  protected log(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    this.logs.push({ timestamp, message, level });
  }

  protected async buildItemProfile(
    restaurant: Restaurant, 
    reviews: Review[]
  ): Promise<ItemProfile> {
    throw new Error('buildItemProfile must be implemented by subclass');
  }

  public async buildItemProfiles(
    restaurants: Restaurant[], 
    reviews: Review[]
  ): Promise<void> {
    this.log('Building item profiles...');
    
    // Group reviews by business_id
    const reviewsByBusiness = new Map<string, Review[]>();
    reviews.forEach(review => {
      const businessReviews = reviewsByBusiness.get(review.business_id) || [];
      businessReviews.push(review);
      reviewsByBusiness.set(review.business_id, businessReviews);
    });

    // Build profiles for each restaurant
    for (const restaurant of restaurants) {
      const businessReviews = reviewsByBusiness.get(restaurant.business_id) || [];
      try {
        const profile = await this.buildItemProfile(restaurant, businessReviews);
        this.itemProfiles.set(restaurant.business_id, profile);
      } catch (error) {
        this.log(`Failed to build profile for ${restaurant.business_id}: ${error}`, 'error');
      }
    }

    this.log(`Built ${this.itemProfiles.size} item profiles`);
  }

  public findSimilarItems(businessId: string, topN: number = 5): SimilarityScore[] {
    const targetProfile = this.itemProfiles.get(businessId);
    if (!targetProfile) {
      this.log(`No profile found for business ${businessId}`, 'error');
      return [];
    }

    const similarities: SimilarityScore[] = [];

    // Calculate similarity with all other businesses
    this.itemProfiles.forEach((profile, id) => {
      if (id !== businessId) {
        const similarity = calculateCosineSimilarity(
          targetProfile.embedding.vector,
          profile.embedding.vector
        );
        similarities.push({ business_id: id, score: similarity });
      }
    });

    // Sort by similarity score and return top N
    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  public getRecommendations(
    userId: string,
    userRatings: Map<string, number>,
    topN: number = 5
  ): RecommendationResult {
    this.log(`Getting recommendations for user ${userId}`);

    // Get user's top rated items
    const userTopItems = Array.from(userRatings.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([businessId]) => businessId);

    if (userTopItems.length === 0) {
      return {
        recommendations: [],
        scores: [],
        explanation: "No user ratings available",
        method: "content-based",
        logs: this.logs.map(log => `${log.timestamp} - ${log.message}`)
      };
    }

    // Get similar items for each top rated item
    const recommendationScores = new Map<string, number>();
    
    userTopItems.forEach(businessId => {
      const similarItems = this.findSimilarItems(businessId, topN);
      similarItems.forEach(({ business_id, score }) => {
        // Skip if user has already rated this item
        if (!userRatings.has(business_id)) {
          const currentScore = recommendationScores.get(business_id) || 0;
          recommendationScores.set(business_id, currentScore + score);
        }
      });
    });

    // Sort and prepare final recommendations
    const sortedRecommendations = Array.from(recommendationScores.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN);

    return {
      recommendations: sortedRecommendations.map(([id]) => id),
      scores: sortedRecommendations.map(([, score]) => score),
      explanation: "Recommendations based on your highly rated restaurants and their similar items",
      method: "content-based",
      logs: this.logs.map(log => `${log.timestamp} - ${log.message}`)
    };
  }

  public getLogs(): LogEntry[] {
    return this.logs;
  }

  public clearLogs(): void {
    this.logs = [];
  }
  
  /**
   * Get the count of item profiles
   * @returns The number of item profiles
   */
  public getItemProfilesCount(): number {
    return this.itemProfiles.size;
  }
  
  /**
   * Get all item profiles
   * @returns The map of all item profiles
   */
  public getAllItemProfiles(): Map<string, ItemProfile> {
    return this.itemProfiles;
  }
  
  /**
   * Set the item profiles map (used for fallback scenarios)
   * @param profiles Map of item profiles
   */
  public setItemProfiles(profiles: Map<string, ItemProfile>): void {
    this.itemProfiles = profiles;
    this.log(`Set ${profiles.size} item profiles`);
  }
}
