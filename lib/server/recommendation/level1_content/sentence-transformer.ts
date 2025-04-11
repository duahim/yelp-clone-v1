import { 
  Restaurant, 
  Review, 
  ItemProfile,
  ContentEmbedding
} from '../types';
import { ContentBasedRecommender } from './base';
import { normalizeVector } from '../utils/similarity';
import { log } from '../utils/logger'; // Import the logging utility
import axios from 'axios';

interface EmbeddingResponse {
  embeddings: number[][];
}

export class SentenceTransformerRecommender extends ContentBasedRecommender {
  private readonly apiEndpoint: string;
  private readonly modelName: string;
  private readonly batchSize: number;

  constructor(
    apiEndpoint: string = process.env.SENTENCE_TRANSFORMER_API || 'http://localhost:8080/embed',
    modelName: string = 'all-MiniLM-L6-v2',
    batchSize: number = 32
  ) {
    super();
    this.apiEndpoint = apiEndpoint;
    this.modelName = modelName;
    this.batchSize = batchSize;
  }

  private async getEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      log(3, `Fetching embeddings for texts: ${texts.join(', ')}`);
      // Split texts into batches to avoid overwhelming the API
      const embeddings: number[][] = [];
      
      for (let i = 0; i < texts.length; i += this.batchSize) {
        const batch = texts.slice(i, i + this.batchSize);
        
        const response = await axios.post<EmbeddingResponse>(this.apiEndpoint, {
          texts: batch,
          model: this.modelName
        });
        
        embeddings.push(...response.data.embeddings);
      }
      
      return embeddings;
    } catch (error) {
      console.error('Error getting embeddings:', error);
      // Return zero vectors as fallback
      return texts.map(() => new Array(384).fill(0)); // 384 is the default dimension for all-MiniLM-L6-v2
    }
  }

  private preprocessText(text: string): string {
    // Basic text preprocessing
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Remove special characters
      .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
      .trim();
  }

  private async computeSentimentScore(reviews: Review[]): Promise<number> {
    if (reviews.length === 0) return 0;
    
    // For now, use a simple average of ratings
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    return (averageRating - 3) / 2; // Normalize to [-1, 1]
  }

  protected async buildItemProfile(
    restaurant: Restaurant,
    reviews: Review[]
  ): Promise<ItemProfile> {
    // Log the start of building the item profile
    log(3, `Starting to build item profile for restaurant ${restaurant.business_id}.`);

    // Combine all review texts
    const combinedText = reviews
      .map(review => review.review_text)
      .join(' ');

    const processedText = this.preprocessText(combinedText);
    
    // Get embedding for the combined text
    const embeddings = await this.getEmbeddings([processedText]);
    const vector = normalizeVector(embeddings[0]);
    
    // Calculate sentiment score
    const sentimentScore = await this.computeSentimentScore(reviews);

    // Log the completion of building the item profile
    log(3, `Completed building item profile for restaurant ${restaurant.business_id} with ${reviews.length} reviews.`);

    return {
      business_id: restaurant.business_id,
      embedding: {
        vector,
        method: 'sentence-transformer'
      },
      sentiment_score: sentimentScore
    };
  }

  /**
   * Get explanation for why items are similar
   * @param businessId1 First business ID
   * @param businessId2 Second business ID
   * @returns Explanation string
   */
  public async getSimilarityExplanation(businessId1: string, businessId2: string): Promise<string> {
    const profile1 = this.itemProfiles.get(businessId1);
    const profile2 = this.itemProfiles.get(businessId2);

    if (!profile1 || !profile2) {
      return "Unable to explain similarity - one or both businesses not found.";
    }

    const similarity = profile1.embedding.vector.reduce((sum, val, i) => 
      sum + val * profile2.embedding.vector[i], 0);

    let explanation = "These restaurants are similar based on their review content. ";
    
    if (similarity > 0.9) {
      explanation += "They show very strong similarities in how customers describe them.";
    } else if (similarity > 0.7) {
      explanation += "They share many common themes in their reviews.";
    } else if (similarity > 0.5) {
      explanation += "They have some overlapping characteristics in their reviews.";
    } else {
      explanation += "They have some subtle similarities in how they are described.";
    }

    const sentimentDiff = Math.abs(profile1.sentiment_score - profile2.sentiment_score);
    if (sentimentDiff < 0.2) {
      explanation += " Both restaurants also receive similar sentiment in their reviews.";
    } else if (sentimentDiff > 0.5) {
      explanation += " However, they tend to receive quite different sentiment in their reviews.";
    }

    // Log the explanation
    log(3, `Similarity explanation between ${businessId1} and ${businessId2}: ${explanation}`);
    
    return explanation;
  }

  /**
   * Get the model name being used
   * @returns The name of the sentence transformer model
   */
  public getModelName(): string {
    return this.modelName;
  }

  /**
   * Get the embedding dimension
   * @returns The dimension of the embeddings
   */
  public getEmbeddingDimension(): number {
    const firstProfile = Array.from(this.itemProfiles.values())[0];
    return firstProfile ? firstProfile.embedding.vector.length : 384; // Default for all-MiniLM-L6-v2
  }
}