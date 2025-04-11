import { 
  Rating,
  Restaurant,
  Review,
  RecommendationResult,
  HybridWeights
} from '../types';
import { HybridRecommender } from './base';

interface ScoredRecommendation {
  business_id: string;
  score: number;
  source: string;
}

interface UserRatings {
  [businessId: string]: number;
}

export class WeightedHybridRecommender extends HybridRecommender {
  private readonly minScore: number;
  private readonly maxScore: number;

  constructor(
    weights: HybridWeights,
    minScore: number = 1,
    maxScore: number = 5
  ) {
    super(weights);
    this.minScore = minScore;
    this.maxScore = maxScore;
  }

  /**
   * Convert user ratings to Map format
   */
  private convertToRatingMap(ratings: UserRatings): Map<string, number> {
    const ratingMap = new Map<string, number>();
    Object.entries(ratings).forEach(([businessId, rating]) => {
      ratingMap.set(businessId, rating);
    });
    return ratingMap;
  }

  /**
   * Normalize scores to [0,1] range
   */
  private normalizeScores(scores: number[]): number[] {
    const range = this.maxScore - this.minScore;
    return scores.map(score => 
      (Math.max(this.minScore, Math.min(this.maxScore, score)) - this.minScore) / range
    );
  }

  /**
   * Combine recommendations from multiple sources
   */
  private async getCombinedRecommendations(
    userId: string,
    topN: number
  ): Promise<ScoredRecommendation[]> {
    const allRecommendations = new Map<string, ScoredRecommendation>();

    // Get content-based recommendations
    if (this.contentRecommender && this.weights.content_based > 0) {
      try {
        const contentRecs = await this.contentRecommender.getRecommendations(
          userId,
          this.convertToRatingMap({ [userId]: 0 }), // Dummy ratings map
          topN
        );
        const normalizedScores = this.normalizeScores(contentRecs.scores);
        
        contentRecs.recommendations.forEach((businessId, i) => {
          allRecommendations.set(businessId, {
            business_id: businessId,
            score: normalizedScores[i] * this.weights.content_based,
            source: 'content-based'
          });
        });
      } catch (error) {
        this.log(`Content-based recommendation error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warning');
      }
    }

    // Get collaborative filtering recommendations
    if (this.collaborativeRecommender && this.weights.collaborative > 0) {
      try {
        const cfRecs = await this.collaborativeRecommender.getRecommendations(userId, topN);
        const normalizedScores = this.normalizeScores(cfRecs.scores);
        
        cfRecs.recommendations.forEach((businessId, i) => {
          const existing = allRecommendations.get(businessId);
          if (existing) {
            existing.score += normalizedScores[i] * this.weights.collaborative;
          } else {
            allRecommendations.set(businessId, {
              business_id: businessId,
              score: normalizedScores[i] * this.weights.collaborative,
              source: 'collaborative'
            });
          }
        });
      } catch (error) {
        this.log(`Collaborative filtering recommendation error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warning');
      }
    }

    // Get matrix factorization recommendations
    if (this.matrixRecommender && this.weights.matrix_factorization && 
        this.weights.matrix_factorization > 0) {
      try {
        const mfRecs = await this.matrixRecommender.getRecommendations(userId, topN);
        const normalizedScores = this.normalizeScores(mfRecs.scores);
        
        mfRecs.recommendations.forEach((businessId, i) => {
          const existing = allRecommendations.get(businessId);
          if (existing) {
            existing.score += normalizedScores[i] * this.weights.matrix_factorization!;
          } else {
            allRecommendations.set(businessId, {
              business_id: businessId,
              score: normalizedScores[i] * this.weights.matrix_factorization!,
              source: 'matrix-factorization'
            });
          }
        });
      } catch (error) {
        this.log(`Matrix factorization recommendation error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warning');
      }
    }

    return Array.from(allRecommendations.values());
  }

  /**
   * Get recommendations using weighted combination
   */
  public async getRecommendations(
    userId: string,
    topN: number = 5
  ): Promise<RecommendationResult> {
    this.log(`Getting weighted hybrid recommendations for user ${userId}`);

    const combinedRecs = await this.getCombinedRecommendations(userId, topN * 2);
    
    if (combinedRecs.length === 0) {
      return {
        recommendations: [],
        scores: [],
        explanation: 'No recommendations available from any source',
        method: 'weighted-hybrid',
        logs: this.getFormattedLogs()
      };
    }

    // Sort by combined score and take top N
    const topRecommendations = combinedRecs
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);

    // Scale scores back to original range
    const range = this.maxScore - this.minScore;
    const scaledScores = topRecommendations.map(rec => 
      rec.score * range + this.minScore
    );

    return {
      recommendations: topRecommendations.map(rec => rec.business_id),
      scores: scaledScores,
      explanation: 'Recommendations combined from multiple sources using weighted scoring',
      method: 'weighted-hybrid',
      logs: this.getFormattedLogs()
    };
  }

  /**
   * Get explanation combining insights from all available recommenders
   */
  public async getRecommendationExplanation(
    userId: string,
    businessId: string
  ): Promise<string> {
    const explanations: string[] = [];

    // Get collaborative filtering explanation
    if (this.collaborativeRecommender && this.weights.collaborative > 0) {
      try {
        const cfExplanation = await this.collaborativeRecommender
          .getRecommendationExplanation(userId, businessId);
        explanations.push(cfExplanation);
      } catch (error) {
        this.log(`Collaborative filtering explanation error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warning');
      }
    }

    // Get matrix factorization explanation
    if (this.matrixRecommender && this.weights.matrix_factorization && 
        this.weights.matrix_factorization > 0) {
      try {
        const mfExplanation = await this.matrixRecommender
          .getRecommendationExplanation(userId, businessId);
        explanations.push(mfExplanation);
      } catch (error) {
        this.log(`Matrix factorization explanation error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warning');
      }
    }

    if (explanations.length === 0) {
      return "This recommendation is based on a combination of different recommendation approaches.";
    }

    // Combine explanations
    return explanations.join(' Additionally, ');
  }

  /**
   * Get contribution of each recommender to the final recommendations
   */
  public getSourceContributions(recommendations: string[]): Map<string, number> {
    const contributions = new Map<string, number>();
    contributions.set('content-based', 0);
    contributions.set('collaborative', 0);
    contributions.set('matrix-factorization', 0);

    let totalWeight = 0;
    recommendations.forEach(businessId => {
      if (this.contentRecommender && this.weights.content_based > 0) {
        contributions.set('content-based', 
          (contributions.get('content-based') || 0) + this.weights.content_based);
        totalWeight += this.weights.content_based;
      }
      if (this.collaborativeRecommender && this.weights.collaborative > 0) {
        contributions.set('collaborative', 
          (contributions.get('collaborative') || 0) + this.weights.collaborative);
        totalWeight += this.weights.collaborative;
      }
      if (this.matrixRecommender && this.weights.matrix_factorization && 
          this.weights.matrix_factorization > 0) {
        contributions.set('matrix-factorization', 
          (contributions.get('matrix-factorization') || 0) + this.weights.matrix_factorization);
        totalWeight += this.weights.matrix_factorization;
      }
    });

    // Normalize contributions
    if (totalWeight > 0) {
      contributions.forEach((value, key) => {
        contributions.set(key, value / totalWeight);
      });
    }

    return contributions;
  }
}
