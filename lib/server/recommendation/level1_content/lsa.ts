import natural from 'natural';
import { TfIdf } from 'natural';
import { 
  Restaurant, 
  Review, 
  ItemProfile,
  ContentEmbedding
} from '../types';
import { ContentBasedRecommender } from './base';
import { normalizeVector } from '../utils/similarity';
import { log } from '../utils/logger'; // Import the logging utility

interface Matrix {
  data: number[][];
  rows: number;
  cols: number;
}

export class LSARecommender extends ContentBasedRecommender {
  private tfidf: TfIdf;
  private readonly numComponents: number;
  private vocabulary: string[];
  private U: Matrix | null;
  private S: number[] | null;
  private VT: Matrix | null;

  constructor(numComponents: number = 50) {
    super();
    this.tfidf = new TfIdf();
    this.numComponents = numComponents;
    this.vocabulary = [];
    this.U = null;
    this.S = null;
    this.VT = null;
  }

  private buildVocabulary(documents: string[]): void {
    const termSet = new Set<string>();
    documents.forEach(doc => {
      const terms = doc.toLowerCase().split(/\W+/);
      terms.forEach(term => {
        if (term.length > 2) { // Skip very short terms
          termSet.add(term);
        }
      });
    });
    this.vocabulary = Array.from(termSet);
  }

  private buildTermDocumentMatrix(documents: string[]): Matrix {
    log(2, `Building term-document matrix for ${documents.length} documents.`);
    const matrix: number[][] = [];
    
    documents.forEach(doc => {
      const termFreq = new Map<string, number>();
      const terms = doc.toLowerCase().split(/\W+/);
      
      // Count term frequencies
      terms.forEach(term => {
        if (this.vocabulary.includes(term)) {
          termFreq.set(term, (termFreq.get(term) || 0) + 1);
        }
      });
      
      // Create document vector
      const docVector = this.vocabulary.map(term => {
        const tf = termFreq.get(term) || 0;
        const idf = Math.log(documents.length / 
          (documents.filter(d => d.includes(term)).length + 1));
        return tf * idf;
      });
      
      matrix.push(docVector);
    });

    return {
      data: matrix,
      rows: matrix.length,
      cols: this.vocabulary.length
    };
  }

  private svd(matrix: Matrix, k: number): { U: Matrix; S: number[]; VT: Matrix } {
    log(2, `Performing SVD on matrix with ${matrix.rows} rows and ${matrix.cols} columns.`);
    // Simple implementation of truncated SVD using power iteration
    const { data, rows, cols } = matrix;
    
    // Initialize random matrices
    const U: number[][] = Array(rows).fill(0)
      .map(() => Array(k).fill(0)
      .map(() => Math.random()));
    
    const S: number[] = Array(k).fill(0);
    
    const VT: number[][] = Array(k).fill(0)
      .map(() => Array(cols).fill(0)
      .map(() => Math.random()));

    // Power iteration
    const maxIter = 100;
    const tolerance = 1e-10;

    for (let i = 0; i < k; i++) {
      let v = VT[i];
      let prevError = Infinity;
      let currentU = Array(rows).fill(0);
      
      for (let iter = 0; iter < maxIter; iter++) {
        // Multiply matrix by v
        currentU = Array(rows).fill(0);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            currentU[r] += data[r][c] * v[c];
          }
        }
        
        // Normalize currentU
        const uNorm = Math.sqrt(currentU.reduce((sum, val) => sum + val * val, 0));
        currentU = currentU.map(val => val / uNorm);
        
        // Multiply matrix transpose by currentU
        let newV = Array(cols).fill(0);
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            newV[c] += data[r][c] * currentU[r];
          }
        }
        
        // Calculate error
        const error = newV.reduce((sum, val, idx) => sum + Math.abs(val - v[idx]), 0);
        if (error < tolerance || Math.abs(error - prevError) < tolerance) {
          break;
        }
        
        prevError = error;
        v = newV;
      }
      
      // Store results
      for (let r = 0; r < rows; r++) {
        U[r][i] = currentU[r];
      }
      S[i] = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
      VT[i] = v.map(val => val / S[i]);
    }

    return {
      U: { data: U, rows, cols: k },
      S,
      VT: { data: VT, rows: k, cols }
    };
  }


  protected async buildItemProfile(
    restaurant: Restaurant,
    reviews: Review[]
  ): Promise<ItemProfile> {
    // Log the start of building the item profile
    log(2, `Starting to build item profile for restaurant ${restaurant.business_id}.`);

    // Combine all review texts
    const combinedText = reviews
      .map(review => review.review_text)
      .join(' ');

    const processedText = combinedText.toLowerCase();
    
    // If this is the first document, initialize vocabulary and LSA
    if (this.vocabulary.length === 0) {
      this.buildVocabulary([processedText]);
      const matrix = this.buildTermDocumentMatrix([processedText]);
      const { U, S, VT } = this.svd(matrix, this.numComponents);
      this.U = U;
      this.S = S;
      this.VT = VT;
    } else {
      // Add document to existing LSA model
      const docVector = this.vocabulary.map(term => {
        const tf = processedText.split(term).length - 1;
        const idf = Math.log(this.U!.rows / 
          (this.vocabulary.filter(t => processedText.includes(t)).length + 1));
        return tf * idf;
      });
      
      // Project into LSA space
      const vector = Array(this.numComponents).fill(0);
      for (let i = 0; i < this.numComponents; i++) {
        for (let j = 0; j < docVector.length; j++) {
          vector[i] += docVector[j] * this.VT!.data[i][j];
        }
        vector[i] /= this.S![i];
      }
      
      // Normalize the vector
      const normalizedVector = normalizeVector(vector);
      
      // Calculate sentiment score
      const sentimentScore = await this.computeSentimentScore(reviews);
      
      // Log the completion of building the item profile
      log(2, `Completed building item profile for restaurant ${restaurant.business_id} with ${reviews.length} reviews.`);

      return {
        business_id: restaurant.business_id,
        embedding: {
          vector: normalizedVector,
          method: 'lsa'
        },
        sentiment_score: sentimentScore
      };
    }

    // For the first document, return its LSA embedding
    return {
      business_id: restaurant.business_id,
      embedding: {
        vector: normalizeVector(this.U!.data[0]),
        method: 'lsa'
      },
      sentiment_score: await this.computeSentimentScore(reviews)
    };
  }

  private async computeSentimentScore(reviews: Review[]): Promise<number> {
    if (reviews.length === 0) return 0;
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    return (averageRating - 3) / 2; // Normalize to [-1, 1]
  }

  /**
   * Get the most important terms for a given concept/component
   * @param conceptIndex Index of the LSA concept
   * @param topN Number of terms to return
   * @returns Array of [term, importance] pairs
   */
  public getConceptTerms(conceptIndex: number, topN: number = 10): [string, number][] {
    if (!this.VT || conceptIndex >= this.VT.rows) {
      return [];
    }

    const conceptVector = this.VT.data[conceptIndex];
    return this.vocabulary
      .map((term, i) => [term, Math.abs(conceptVector[i])] as [string, number])
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN);
  }

  /**
   * Get explanation for why items are similar based on LSA concepts
   * @param businessId1 First business ID
   * @param businessId2 Second business ID
   * @returns Explanation string
   */
  public getSimilarityExplanation(businessId1: string, businessId2: string): string {
    const profile1 = this.itemProfiles.get(businessId1);
    const profile2 = this.itemProfiles.get(businessId2);

    if (!profile1 || !profile2) {
      return "Unable to explain similarity - one or both businesses not found.";
    }

    // Find the most similar concepts between the two businesses
    const vector1 = profile1.embedding.vector;
    const vector2 = profile2.embedding.vector;

    // Get indices of top matching concepts
    const conceptSimilarities = vector1.map((val, i) => ({
      index: i,
      similarity: Math.abs(val - vector2[i])
    }));

    const topConcepts = conceptSimilarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    // Get important terms for each concept
    const conceptTerms = topConcepts.map(concept => 
      this.getConceptTerms(concept.index, 3)
        .map(([term]) => term)
        .join(', ')
    );

    // Log the explanation
    const explanation = `These restaurants are similar because they share these characteristics: ${conceptTerms.join('; ')}`;
    log(3, `Similarity explanation between ${businessId1} and ${businessId2}: ${explanation}`);

    return `These restaurants are similar because they share these characteristics: ${conceptTerms.join('; ')}`;
  }
}
