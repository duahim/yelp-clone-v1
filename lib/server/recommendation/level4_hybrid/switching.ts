import { 
  Rating,
  Restaurant,
  Review,
  RecommendationResult,
  HybridWeights
} from '../types';
import { HybridRecommender } from './base';

interface SwitchingCriteria {
  minRatings: number;      // Minimum ratings needed for CF/MF
  minSimilarity: number;   // Minimum similarity for content-based
  coldStartThreshold: number;  // Number of ratings below which a user is considered "cold"
}

export class SwitchingHybridRecommender extends HybridRecommender {
  private readonly criteria: SwitchingCriteria;
  private userRatings: Map<string, Set<string>>;  // user_id -> set of rated business_ids

  constructor(
    weights: HybridWeights,
    criteria: Partial<SwitchingCriteria> = {}
  ) {
    super(weights);
    this.criteria = {
      minRatings: criteria.minRatings || 10,
      minSimilarity: criteria.minSimilarity || 0.1,
      coldStartThreshold: criteria.coldStartThreshold || 5
    };
    this.userRatings = new Map();
  }

  /**
   * Override initialize to build user rating data
   */
  public async initialize(
    restaurants: Restaurant[],
    reviews: Review[],
    ratings: Rating[]
  ): Promise<void> {
    await super.initialize(restaurants, reviews, ratings);

    // Build user rating data
    this.userRatings.clear();
    ratings.forEach(rating => {
      if (!this.userRatings.has(rating.user_id)) {
        this.userRatings.set(rating.user_id, new Set());
      }
      this.userRatings.get(rating.user_id)!.add(rating.business_id);
    });

    this.log('User rating data initialized');
  }

  /**
   * Determine the best recommendation method for a user
   */
  private async determineRecommendationMethod(userId: string): Promise<{
    method: 'content-based' | 'collaborative' | 'matrix-factorization';
    reason: string;
  }> {
    const userRatingCount = this.userRatings.get(userId)?.size || 0;

    // Cold start case: use content-based
    if (userRatingCount < this.criteria.coldStartThreshold) {
      return {
        method: 'content-based',
        reason: `User has only ${userRatingCount} ratings (cold start case)`
      };
    }

    // Check if we have enough data for CF/MF
    if (userRatingCount >= this.criteria.minRatings) {
      // If matrix factorization is available and weighted, prefer it
      if (this.matrixRecommender && 
          this.weights.matrix_factorization && 
          this.weights.matrix_factorization > 0) {
        return {
          method: 'matrix-factorization',
          reason: 'User has sufficient ratings for matrix factorization'
        };
      }

      // Otherwise use collaborative filtering
      if (this.collaborativeRecommender && this.weights.collaborative > 0) {
        return {
          method: 'collaborative',
          reason: 'User has sufficient ratings for collaborative filtering'
        };
      }
    }

    // Default to content-based
    return {
      method: 'content-based',
      reason: 'Using content-based as fallback method'
    };
  }

  /**
   * Get recommendations using the most appropriate method
   */
  public async getRecommendations(
    userId: string,
    topN: number = 5
  ): Promise<RecommendationResult> {
    this.log(`Getting switching hybrid recommendations for user ${userId}`);

    const { method, reason } = await this.determineRecommendationMethod(userId);
    this.log(`Selected method: ${method} (${reason})`);

    try {
      let recommendations: RecommendationResult;

      switch (method) {
        case 'content-based':
          if (!this.contentRecommender) {
            throw new Error('Content-based recommender not available');
          }
          recommendations = await this.contentRecommender.getRecommendations(
            userId,
            new Map(Array.from(this.userRatings.get(userId) || [])
              .map(businessId => [businessId, 1])),
            topN
          );
          break;

        case 'collaborative':
          if (!this.collaborativeRecommender) {
            throw new Error('Collaborative filtering recommender not available');
          }
          recommendations = await this.collaborativeRecommender.getRecommendations(
            userId,
            topN
          );
          break;

        case 'matrix-factorization':
          if (!this.matrixRecommender) {
            throw new Error('Matrix factorization recommender not available');
          }
          recommendations = await this.matrixRecommender.getRecommendations(
            userId,
            topN
          );
          break;

        default:
          throw new Error(`Unknown recommendation method: ${method}`);
      }

      return {
        ...recommendations,
        method: 'switching-hybrid',
        explanation: `${recommendations.explanation} (Selected method: ${method} - ${reason})`,
        logs: this.getFormattedLogs()
      };

    } catch (error) {
      this.log(`Error getting recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      
      // Fallback to content-based if available
      if (method !== 'content-based' && this.contentRecommender) {
        this.log('Falling back to content-based recommendations');
        const fallbackRecs = await this.contentRecommender.getRecommendations(
          userId,
          new Map(Array.from(this.userRatings.get(userId) || [])
            .map(businessId => [businessId, 1])),
          topN
        );
        return {
          ...fallbackRecs,
          method: 'switching-hybrid',
          explanation: `${fallbackRecs.explanation} (Fallback method due to error)`,
          logs: this.getFormattedLogs()
        };
      }

      return {
        recommendations: [],
        scores: [],
        explanation: `Failed to get recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        method: 'switching-hybrid',
        logs: this.getFormattedLogs()
      };
    }
  }

  /**
   * Get explanation using the most appropriate method
   */
  public async getRecommendationExplanation(
    userId: string,
    businessId: string
  ): Promise<string> {
    const { method, reason } = await this.determineRecommendationMethod(userId);

    try {
      let explanation: string;

      switch (method) {
        case 'collaborative':
          if (!this.collaborativeRecommender) {
            throw new Error('Collaborative filtering recommender not available');
          }
          explanation = await this.collaborativeRecommender
            .getRecommendationExplanation(userId, businessId);
          break;

        case 'matrix-factorization':
          if (!this.matrixRecommender) {
            throw new Error('Matrix factorization recommender not available');
          }
          explanation = await this.matrixRecommender
            .getRecommendationExplanation(userId, businessId);
          break;

        default:
          explanation = "This recommendation is based on the restaurant's features and your preferences.";
      }

      return `${explanation} We used ${method} recommendations because ${reason}.`;

    } catch (error) {
      return `We recommended this restaurant using our hybrid recommendation system. ` +
             `(Error getting detailed explanation: ${error instanceof Error ? error.message : 'Unknown error'})`;
    }
  }

  /**
   * Get the current switching criteria
   */
  public getCriteria(): SwitchingCriteria {
    return { ...this.criteria };
  }

  /**
   * Update the switching criteria
   */
  public updateCriteria(newCriteria: Partial<SwitchingCriteria>): void {
    Object.assign(this.criteria, newCriteria);
    this.log('Switching criteria updated');
  }

  /**
   * Get statistics about method usage
   */
  public getMethodStats(): {
    totalUsers: number;
    methodCounts: { [key: string]: number };
  } {
    const methodCounts = {
      'content-based': 0,
      'collaborative': 0,
      'matrix-factorization': 0
    };

    const totalUsers = this.userRatings.size;
    
    this.userRatings.forEach((_, userId) => {
      const ratingCount = this.userRatings.get(userId)?.size || 0;
      
      if (ratingCount < this.criteria.coldStartThreshold) {
        methodCounts['content-based']++;
      } else if (ratingCount >= this.criteria.minRatings) {
        if (this.matrixRecommender && this.weights.matrix_factorization) {
          methodCounts['matrix-factorization']++;
        } else {
          methodCounts['collaborative']++;
        }
      } else {
        methodCounts['content-based']++;
      }
    });

    return {
      totalUsers,
      methodCounts
    };
  }
}
