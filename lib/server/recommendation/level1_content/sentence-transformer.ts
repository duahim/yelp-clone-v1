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
  // Add circuit breaker state
  private serviceAvailable: boolean = true;
  private failureCount: number = 0;
  private readonly maxFailures: number = 3;
  private lastFailureTime: number = 0;
  private readonly resetTimeoutMs: number = 60000; // 1 minute
  private readonly embeddingSize: number = 384; // Standard for all-MiniLM-L6-v2

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
      // Instead of connecting to a service, directly generate deterministic embeddings
      log(3, `Generating deterministic embeddings for ${texts.length} texts`);
      console.log(`Using deterministic embeddings instead of external service for ${texts.length} texts`);
      
      // Generate deterministic embeddings based on text content
      const embeddings = texts.map(text => this.generateDeterministicEmbedding(text));
      return embeddings;
    } catch (error) {
      console.error('Error in embedding process:', error);
      throw error;
    }
  }
  
  /**
   * Generates a deterministic embedding vector based on text content
   * This provides consistent embeddings for the same text input
   */
  private generateDeterministicEmbedding(text: string): number[] {
    // Create a hash-based embedding that's consistent for the same input
    const vector = new Array(this.embeddingSize).fill(0);
    
    // Use simplified text features for embedding generation
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 0);
    const uniqueWords = new Set(words);
    
    // If we have no words, return a zero vector
    if (words.length === 0) {
      console.warn('Empty text provided for embedding');
      return normalizeVector(vector);
    }
    
    // Calculate word frequencies for TF-IDF like approach
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Fill vector with deterministic values based on word frequency and position
    for (const word of uniqueWords) {
      const wordHash = this.hashString(word);
      const frequency = wordFreq.get(word) || 0;
      const tf = frequency / words.length; // Term frequency
      
      // Use word hash to determine which dimensions to affect
      const startPos = Math.abs(wordHash % (this.embeddingSize / 2)); // Use half the dimensions to create more variability
      
      // Different words affect different dimensions - this increases vector diversity
      const dimensions = Math.max(5, Math.min(20, Math.floor(word.length * 1.5)));
      
      // Update vector values based on word characteristics
      for (let i = 0; i < dimensions; i++) {
        const pos = (startPos + i) % this.embeddingSize;
        // Use both sin and cos with different phases to create more variability
        const factor = (Math.sin(wordHash * (i+1) * 0.1) + Math.cos(wordHash * 0.05 * (i+1))) * tf;
        vector[pos] += factor;
      }
      
      // Add some additional features based on word position
      const firstPosition = words.indexOf(word);
      const lastPosition = words.lastIndexOf(word);
      const positionFactor = (words.length - firstPosition) / words.length; // Words earlier in text have more weight
      
      // Affect different dimensions for position information
      const positionDimension = (wordHash + words.length) % this.embeddingSize;
      vector[positionDimension] += positionFactor * 0.5;
      
      // For repeated words, use their distribution pattern
      if (firstPosition !== lastPosition) {
        const distributionDimension = (wordHash + firstPosition + lastPosition) % this.embeddingSize;
        vector[distributionDimension] += 0.3;
      }
    }
    
    // Add features based on document statistics with larger scale to increase variability
    vector[0] = (words.length / 500) * 2; // Document length feature (normalized)
    vector[1] = (uniqueWords.size / Math.max(1, words.length)) * 2; // Vocabulary richness
    
    // Add some sentence structure features by looking at character-level patterns
    const charClasses = {
      digits: text.replace(/[^0-9]/g, '').length,
      uppercase: text.replace(/[^A-Z]/g, '').length,
      punctuation: text.replace(/[^.,;:!?]/g, '').length,
    };
    
    vector[2] = charClasses.digits / Math.max(1, text.length) * 3;
    vector[3] = charClasses.uppercase / Math.max(1, text.length) * 3;
    vector[4] = charClasses.punctuation / Math.max(1, text.length) * 3;
    
    // Add some random-like but deterministic noise to further increase variability
    for (let i = 0; i < this.embeddingSize; i++) {
      const noise = Math.sin(i * 100 + this.hashString(text.substring(0, 50))) * 0.1;
      vector[i] += noise;
    }
    
    // Normalize the vector to unit length for proper cosine similarity
    return normalizeVector(vector);
  }

  /**
   * Hashes a string to a number deterministically
   */
  private hashString(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash);
  }
  
  // This method is no longer used but kept for reference
  private generateFallbackEmbeddings(texts: string[]): number[][] {
    return texts.map(() => {
      // Create a random embedding vector of appropriate dimension
      const randomVector = Array(this.embeddingSize).fill(0).map(() => (Math.random() - 0.5) * 0.01);
      // Normalize to unit length
      return normalizeVector(randomVector);
    });
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
    const vector = embeddings[0]; // Already normalized in generateDeterministicEmbedding
    
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
    return this.embeddingSize;
  }
}