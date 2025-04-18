import { 
  Rating,
  UserPreferences,
  UserSimilarityScore,
  ItemSimilarityScore,
  RecommendationResult,
  LogEntry
} from '../types';
import { calculatePearsonCorrelation } from '../utils/similarity';
import * as fs from 'fs';
import * as path from 'path';

export abstract class CollaborativeFilteringRecommender {
  protected userRatings: Map<string, Map<string, number>>;  // user_id -> (business_id -> rating)
  protected itemRatings: Map<string, Map<string, number>>;  // business_id -> (user_id -> rating)
  protected logs: LogEntry[];
  protected readonly minRatings: number;
  // Add a cache for similarity calculations
  protected userSimilarityCache: Map<string, Map<string, number>>;  // user_id -> (other_user_id -> similarity)
  protected itemSimilarityCache: Map<string, Map<string, number>>;  // business_id -> (other_business_id -> similarity)

  constructor(minRatings: number = 1) {
    this.userRatings = new Map();
    this.itemRatings = new Map();
    this.logs = [];
    this.minRatings = minRatings;
    this.userSimilarityCache = new Map();
    this.itemSimilarityCache = new Map();
  }

  protected log(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    this.logs.push({ timestamp, message, level });
  }

  /**
   * Save similarity caches to disk
   */
  protected saveCachesToDisk(): void {
    try {
      const cacheDir = path.join(process.cwd(), 'cache');
      
      // Create cache directory if it doesn't exist
      if (!fs.existsSync(cacheDir)) {
        this.log('Creating cache directory', 'info');
        fs.mkdirSync(cacheDir, { recursive: true });
      } else {
        this.log('Cache directory already exists', 'info');
      }
      
      // Convert Map to serializable object
      const serializeCache = (cache: Map<string, Map<string, number>>) => {
        const obj: Record<string, Record<string, number>> = {};
        cache.forEach((innerMap, key) => {
          obj[key] = {};
          innerMap.forEach((value, innerKey) => {
            obj[key][innerKey] = value;
          });
        });
        return obj;
      };
      
      // Save user similarity cache
      const userCachePath = path.join(cacheDir, 'user_similarity_cache.json');
      const serializedUserCache = serializeCache(this.userSimilarityCache);
      fs.writeFileSync(userCachePath, JSON.stringify(serializedUserCache, null, 2));
      this.log(`Saved user similarity cache with ${this.userSimilarityCache.size} entries`, 'info');
      
      // Save item similarity cache
      const itemCachePath = path.join(cacheDir, 'item_similarity_cache.json');
      const serializedItemCache = serializeCache(this.itemSimilarityCache);
      fs.writeFileSync(itemCachePath, JSON.stringify(serializedItemCache, null, 2));
      this.log(`Saved item similarity cache with ${this.itemSimilarityCache.size} entries`, 'info');
    } catch (error) {
      this.log(`Error saving caches to disk: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }

  /**
   * Load similarity caches from disk
   */
  protected loadCachesFromDisk(): void {
    try {
      const cacheDir = path.join(process.cwd(), 'cache');
      if (!fs.existsSync(cacheDir)) {
        this.log('Cache directory does not exist, skipping cache loading', 'info');
        return;
      }
      
      // Helper to deserialize cache from JSON
      const deserializeCache = (obj: Record<string, Record<string, number>>): Map<string, Map<string, number>> => {
        const cache = new Map<string, Map<string, number>>();
        Object.entries(obj).forEach(([key, innerObj]) => {
          const innerMap = new Map<string, number>();
          Object.entries(innerObj).forEach(([innerKey, value]) => {
            innerMap.set(innerKey, value);
          });
          cache.set(key, innerMap);
        });
        return cache;
      };
      
      // Load user similarity cache
      const userCachePath = path.join(cacheDir, 'user_similarity_cache.json');
      if (fs.existsSync(userCachePath)) {
        const userCacheData = JSON.parse(fs.readFileSync(userCachePath, 'utf8'));
        this.userSimilarityCache = deserializeCache(userCacheData);
        this.log(`Loaded user similarity cache with ${this.userSimilarityCache.size} entries`, 'info');
      }
      
      // Load item similarity cache
      const itemCachePath = path.join(cacheDir, 'item_similarity_cache.json');
      if (fs.existsSync(itemCachePath)) {
        const itemCacheData = JSON.parse(fs.readFileSync(itemCachePath, 'utf8'));
        this.itemSimilarityCache = deserializeCache(itemCacheData);
        this.log(`Loaded item similarity cache with ${this.itemSimilarityCache.size} entries`, 'info');
      }
    } catch (error) {
      this.log(`Error loading caches from disk: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }

  /**
   * Initialize the recommender with rating data
   * @param ratings Array of rating objects
   */
  public async initialize(ratings: Rating[]): Promise<void> {
    this.log('Initializing collaborative filtering recommender...');
    
    // Load caches at startup
    this.loadCachesFromDisk();
    
    // Build user ratings map
    ratings.forEach(rating => {
      // Add to user ratings
      if (!this.userRatings.has(rating.user_id)) {
        this.userRatings.set(rating.user_id, new Map());
      }
      this.userRatings.get(rating.user_id)!.set(rating.business_id, rating.rating);

      // Add to item ratings
      if (!this.itemRatings.has(rating.business_id)) {
        this.itemRatings.set(rating.business_id, new Map());
      }
      this.itemRatings.get(rating.business_id)!.set(rating.user_id, rating.rating);
    });

    this.log(`collaborative filtering: Processed ${ratings.length} ratings for ${this.userRatings.size} users and ${this.itemRatings.size} items`);
    
    // Additional initialization if needed
    await this.additionalInitialization();
  }

  /**
   * Hook for additional initialization steps in subclasses
   */
  protected async additionalInitialization(): Promise<void> {
    // To be implemented by subclasses if needed
  }

  /**
   * Calculate similarity between two users or items
   * @param id1 First user/item ID
   * @param id2 Second user/item ID
   * @param type Whether to calculate similarity between users or items
   * @returns Similarity score
   */
  protected calculateSimilarity(
    id1: string,
    id2: string,
    type: 'user' | 'item'
  ): number {
    // Check if we have the result in cache first
    const cache = type === 'user' ? this.userSimilarityCache : this.itemSimilarityCache;
    
    // Create consistent order key - always use alphabetical order for cache key
    const [firstId, secondId] = [id1, id2].sort();
    
    // Check if we have the first ID in the cache
    if (cache.has(firstId)) {
      const innerCache = cache.get(firstId)!;
      // Check if we have the second ID in the inner cache
      if (innerCache.has(secondId)) {
        const cachedSimilarity = innerCache.get(secondId)!;
        this.log(`collaborative filtering: Using cached ${type} similarity between ${id1} and ${id2}: ${cachedSimilarity.toFixed(4)}`, 'info');
        return cachedSimilarity;
      }
    }
    
    // If not in cache, calculate and store
    this.log(`collaborative filtering: Calculating ${type} similarity between ${id1} and ${id2}`);
    
    const ratings1 = type === 'user' ? 
      this.userRatings.get(id1) : 
      this.itemRatings.get(id1);
    
    const ratings2 = type === 'user' ? 
      this.userRatings.get(id2) : 
      this.itemRatings.get(id2);

    if (!ratings1 || !ratings2) {
      this.log(`collaborative filtering: Cannot calculate similarity: ${type} ${!ratings1 ? id1 : id2} has no ratings`, 'warning');
      return 0;
    }
    
    this.log(`collaborative filtering: ${type} ${id1} has ${ratings1.size} ratings`);
    this.log(`collaborative filtering: ${type} ${id2} has ${ratings2.size} ratings`);

    // Get common ratings
    const commonIds = type === 'user' ?
      Array.from(ratings1.keys()).filter(itemId => ratings2.has(itemId)) :
      Array.from(ratings1.keys()).filter(userId => ratings2.has(userId));

    if (commonIds.length < this.minRatings) {
      this.log(`collaborative filtering: Not enough common ${type === 'user' ? 'items' : 'users'} between ${id1} and ${id2}: ${commonIds.length} < ${this.minRatings} required`, 'info');
      return 0;
    }

    this.log(`collaborative filtering: Found ${commonIds.length} common ${type === 'user' ? 'items' : 'users'} between ${id1} and ${id2}`, 'info');
    
    if (commonIds.length > 0) {
      // Log the common items for better insight
      const commonDetails = commonIds.map(commonId => {
        const rating1 = ratings1.get(commonId)!;
        const rating2 = ratings2.get(commonId)!;
        return `${commonId}: ${rating1} vs ${rating2}`;
      }).join(", ");
      
      this.log(`collaborative filtering: Common ${type === 'user' ? 'items' : 'users'} details: ${commonDetails}`, 'info');
    }

    // Create vectors of ratings for common items/users
    const vector1 = commonIds.map(id => ratings1.get(id)!);
    const vector2 = commonIds.map(id => ratings2.get(id)!);
    
    this.log(`collaborative filtering: Vector1: [${vector1.join(", ")}]`, 'info');
    this.log(`collaborative filtering: Vector2: [${vector2.join(", ")}]`, 'info');

    try {
      const similarity = calculatePearsonCorrelation(vector1, vector2);
      this.log(`collaborative filtering: Similarity between ${type} ${id1} and ${id2}: ${similarity.toFixed(4)}`, 'info');
      
      if (isNaN(similarity)) {
        this.log(`collaborative filtering: Warning: Similarity calculation resulted in NaN - falling back to 0`, 'warning');
        return 0;
      }
      
      // Store in cache for future use
      if (!cache.has(firstId)) {
        cache.set(firstId, new Map());
      }
      cache.get(firstId)!.set(secondId, similarity);
      
      return similarity;
    } catch (error) {
      this.log(`collaborative filtering: Error calculating similarity: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return 0;
    }
  }

  /**
   * Get similar users
   * @param userId User ID
   * @param topN Number of similar users to return
   */
  protected getSimilarUsers(userId: string, topN: number = 5): UserSimilarityScore[] {
    this.log(`collaborative filtering: Finding similar users for user ${userId} (topN=${topN})`, 'info');
    
    const allUserIds = Array.from(this.userRatings.keys());
    this.log(`collaborative filtering: Total users in system: ${allUserIds.length}`, 'info');
    
    const otherUsers = allUserIds.filter(id => id !== userId);
    this.log(`collaborative filtering: ${otherUsers.length} other users will be considered for similarity calculation`, 'info');

    this.log(`collaborative filtering: Starting similarity calculations for user ${userId}...`, 'info');
    const similarityScores: UserSimilarityScore[] = [];
    
    for (const otherId of otherUsers) {
      const score = this.calculateSimilarity(userId, otherId, 'user');
      if (score > 0) {
        similarityScores.push({
          user_id: otherId,
          score: score
        });
      }
    }
      
    this.log(`collaborative filtering: Calculated positive similarity with ${similarityScores.length} users out of ${otherUsers.length} total`, 'info');
    
    // Save caches after calculations
    this.saveCachesToDisk();
    
    if (similarityScores.length === 0) {
      this.log(`collaborative filtering: No users with positive similarity to ${userId} were found`, 'warning');
      return [];
    }
    
    // Sort by similarity score descending
    const sortedScores = similarityScores.sort((a, b) => b.score - a.score);
    
    // Get the top N similar users
    const result = sortedScores.slice(0, topN);
    
    // Log the similarity score distribution
    if (sortedScores.length > 0) {
      const max = sortedScores[0].score;
      const min = sortedScores[sortedScores.length - 1].score;
      const avg = sortedScores.reduce((sum, item) => sum + item.score, 0) / sortedScores.length;
      
      this.log(`collaborative filtering: Similarity score stats: max=${max.toFixed(4)}, min=${min.toFixed(4)}, avg=${avg.toFixed(4)}`, 'info');
    }
      
    this.log(`collaborative filtering: Top ${result.length} similar users:`, 'info');
    result.forEach((user, index) => {
      this.log(`collaborative filtering:   #${index+1}: User ${user.user_id} (similarity: ${user.score.toFixed(4)})`, 'info');
    });

    return result;
  }

  /**
   * Get similar items
   * @param businessId Business ID
   * @param topN Number of similar items to return
   */
  protected getSimilarItems(businessId: string, topN: number = 5): ItemSimilarityScore[] {
    const allItemIds = Array.from(this.itemRatings.keys());

    const similarities = allItemIds
      .filter(otherId => otherId !== businessId)
      .map(otherId => ({
        business_id: otherId,
        score: this.calculateSimilarity(businessId, otherId, 'item')
      }))
      .filter(sim => sim.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
    
    // Save caches after calculations
    this.saveCachesToDisk();
    
    return similarities;
  }

  /**
   * Get recommendations for a user
   * @param userId User ID
   * @param topN Number of recommendations to return
   */
  public abstract getRecommendations(
    userId: string,
    topN?: number
  ): Promise<RecommendationResult>;

  /**
   * Get explanation for a recommendation
   * @param userId User ID
   * @param businessId Business ID
   */
  public abstract getRecommendationExplanation(
    userId: string,
    businessId: string
  ): Promise<string>;

  /**
   * Get the logs
   * @returns Array of log entries
   */
  public getLogs(): LogEntry[] {
    return this.logs;
  }

  /**
   * Clear the logs
   */
  public clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get statistics about the recommender
   */
  public getStats(): {
    numUsers: number;
    numItems: number;
    numRatings: number;
    sparsity: number;
  } {
    const numUsers = this.userRatings.size;
    const numItems = this.itemRatings.size;
    let numRatings = 0;
    
    this.userRatings.forEach(ratings => {
      numRatings += ratings.size;
    });

    const sparsity = 1 - (numRatings / (numUsers * numItems));

    return {
      numUsers,
      numItems,
      numRatings,
      sparsity
    };
  }
}
