import natural from 'natural';
import { TfIdf } from 'natural';
import { 
  Restaurant, 
  Review, 
  ItemProfile,
  ContentEmbedding,
  RecommendationResult,
  SimilarityScore
} from '../types';
import { ContentBasedRecommender } from './base';
import { normalizeVector, calculateCosineSimilarity } from '../utils/similarity';
import { log } from '../utils/logger'; // Import the logging utility

// Define interfaces for TF-IDF types
interface TfIdfTerm {
  term: string;
  tfidf: number;
}

interface TfIdfDocument {
  [term: string]: number;
}

export class TfIdfRecommender extends ContentBasedRecommender {
  private tfidf: TfIdf;
  private readonly numFeatures: number;

  constructor(numFeatures: number = 50) {
    super();
    this.tfidf = new TfIdf();
    this.numFeatures = numFeatures;
  }

  private preprocessText(text: string): string {
    // Convert to lowercase
    text = text.toLowerCase();
    
    // Remove special characters and extra spaces
    text = text.replace(/[^\w\s]/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

  private async computeSentimentScore(reviews: Review[]): Promise<number> {
    if (reviews.length === 0) return 0;

    // For now, use a simple average of ratings
    // TODO: Implement more sophisticated sentiment analysis
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    
    // Normalize to [-1, 1] range
    return (averageRating - 3) / 2;
  }

  protected async buildItemProfile(
    restaurant: Restaurant,
    reviews: Review[]
  ): Promise<ItemProfile> {
    // Log the start of building the item profile
    log(1, `Starting to build item profile for restaurant ${restaurant.business_id}.`);

    // Combine all review texts
    const combinedText = reviews
      .map(review => review.review_text)
      .join(' ');

    const processedText = this.preprocessText(combinedText);
    
    // Add to TF-IDF model
    this.tfidf.addDocument(processedText);
    
    // Get TF-IDF scores for all terms
    const terms = new Map<string, number>();
    this.tfidf.listTerms(this.tfidf.documents.length - 1)
      .forEach((item: TfIdfTerm) => {
        terms.set(item.term, item.tfidf);
      });

    // Sort terms by TF-IDF score and take top N features
    const topTerms = Array.from(terms.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, this.numFeatures);

    // Create feature vector
    const vector = normalizeVector(topTerms.map(([, score]) => score));

    // Calculate sentiment score
    const sentimentScore = await this.computeSentimentScore(reviews);

    // Log the completion of building the item profile
    log(1, `Completed building item profile for restaurant ${restaurant.business_id} with ${reviews.length} reviews.`);

    return {
      business_id: restaurant.business_id,
      embedding: {
        vector,
        method: 'tfidf'
      },
      sentiment_score: sentimentScore
    };
  }

  /**
   * Get the most important terms for a given business
   * @param businessId Business ID
   * @param topN Number of terms to return
   * @returns Array of [term, importance] pairs
   */
  public getImportantTerms(businessId: string, topN: number = 10): [string, number][] {
    const profile = this.itemProfiles.get(businessId);
    if (!profile) {
      this.log(`No profile found for business ${businessId}`, 'error');
      return [];
    }

    // Get document index for this business
    const docIndex = Array.from(this.itemProfiles.keys()).indexOf(businessId);
    if (docIndex === -1) return [];

    // Get terms and their TF-IDF scores
    return this.tfidf.listTerms(docIndex)
      .sort((termA: TfIdfTerm, termB: TfIdfTerm) => termB.tfidf - termA.tfidf)
      .slice(0, topN)
      .map((item: TfIdfTerm) => [item.term, item.tfidf]);
  }

  /**
   * Get explanation for why items are similar
   * @param businessId1 First business ID
   * @param businessId2 Second business ID
   * @returns Explanation string
   */
  public getSimilarityExplanation(businessId1: string, businessId2: string): string {
    const terms1 = new Set(this.getImportantTerms(businessId1, 5).map(([term]) => term));
    const terms2 = new Set(this.getImportantTerms(businessId2, 5).map(([term]) => term));
    
    const commonTerms = [...terms1].filter(term => terms2.has(term));
    
    if (commonTerms.length === 0) {
      return "These restaurants share similar overall patterns in their reviews.";
    }

    return `These restaurants are similar because they share common characteristics in their reviews, including: ${commonTerms.join(', ')}.`;
  }

  public getRecommendations(
    userId: string,
    userRatings: Map<string, number>,
    topN: number = 5
  ): RecommendationResult {
    const logs: string[] = [];
    logs.push(`Starting recommendations for user ${userId} with ${userRatings.size} ratings`);

    // If user has no ratings, return empty recommendations
    if (userRatings.size === 0) {
      logs.push('No ratings found for user');
      return {
        recommendations: [],
        scores: [],
        explanation: 'No ratings found for user',
        method: 'tfidf',
        logs
      };
    }

    // If user has only one rating, we need to handle this case specially
    if (userRatings.size === 1) {
      logs.push('User has only one rating, using simplified recommendation approach');
      const [ratedBusinessId, rating] = Array.from(userRatings.entries())[0];
      
      // Get the rated restaurant's profile
      const ratedProfile = this.itemProfiles.get(ratedBusinessId);
      if (!ratedProfile) {
        logs.push(`No profile found for rated business ${ratedBusinessId}`);
        return {
          recommendations: [],
          scores: [],
          explanation: 'No profile found for rated business',
          method: 'tfidf',
          logs
        };
      }

      // Find similar restaurants based on the single rating
      const similarities: SimilarityScore[] = [];
      for (const [businessId, profile] of this.itemProfiles.entries()) {
        if (businessId === ratedBusinessId) continue;
        
        const similarity = calculateCosineSimilarity(
          ratedProfile.embedding.vector,
          profile.embedding.vector
        );
        similarities.push({ business_id: businessId, score: similarity });
      }

      // Sort by similarity and get top recommendations
      const sortedSimilarities = similarities
        .sort((a, b) => b.score - a.score)
        .slice(0, topN);

      logs.push(`Generated ${sortedSimilarities.length} recommendations based on single rating`);
      
      return {
        recommendations: sortedSimilarities.map(s => s.business_id),
        scores: sortedSimilarities.map(s => s.score),
        explanation: `Based on your rating for ${ratedBusinessId}, we found similar restaurants that might interest you.`,
        method: 'tfidf',
        logs
      };
    }

    // For users with multiple ratings, use the standard approach
    return super.getRecommendations(userId, userRatings, topN);
  }
}