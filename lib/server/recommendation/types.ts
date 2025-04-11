// Common types used across recommendation systems

export interface Restaurant {
  business_id: string;
  name: string;
  review_text?: string;
  categories?: string[];
  // Add other restaurant fields as needed
}

export interface Review {
  business_id: string;
  user_id: string;
  review_text: string;
  rating: number;
}

export interface Rating {
  business_id: string;
  user_id: string;
  rating: number;
}

// Level 1: Content-based Filtering Types
export interface ContentEmbedding {
  vector: number[];
  method: 'tfidf' | 'lsa' | 'sentence-transformer';
}

export interface ItemProfile {
  business_id: string;
  embedding: ContentEmbedding;
  sentiment_score: number;
}

export interface SimilarityScore {
  business_id: string;
  score: number;
}

// Level 2: Collaborative Filtering Types
export interface UserSimilarityScore {
  user_id: string;
  score: number;
}

export interface ItemSimilarityScore {
  business_id: string;
  score: number;
}

export interface RecommendationResult {
  recommendations: string[];  // business_ids
  scores: number[];
  explanation: string;
  method: string;
  logs: string[];
}

// Level 3: Matrix Factorization Types
export interface MatrixFactorizationModel {
  userFactors: number[][];
  itemFactors: number[][];
  explained_variance_ratio?: number[];  // For PCA
}

// Level 4: Hybrid Types
export interface HybridWeights {
  content_based: number;
  collaborative: number;
  matrix_factorization?: number;
}

export interface HybridStats {
  activeRecommenders: string[];
  weights: HybridWeights;
  contentStats?: {
    numProfiles: number;
    avgProfileSize: number;
  };
  collaborativeStats?: {
    numUsers: number;
    numItems: number;
    sparsity: number;
  };
  matrixStats?: {
    numUsers: number;
    numItems: number;
    numFactors: number;
    sparsity: number;
  };
}

// Level 5: Clustering Types
export interface ClusteringResult {
  cluster_id: number;
  cluster_members: string[];  // business_ids
  centroid: number[];
}

// Logging and Caching Types
export interface LogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'warning' | 'error';
}

export interface CacheConfig {
  path: string;
  ttl?: number;  // Time to live in seconds
  force_recompute?: boolean;
}

// User Preferences
export interface UserPreferences {
  user_id: string;
  ratings: Map<string, number>;  // business_id -> rating
}
