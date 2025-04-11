import { 
  Restaurant,
  Review,
  Rating,
  RecommendationResult
} from '../types';
import { ClusteringRecommender } from './base';
import { ContentBasedRecommender } from '../level1_content/base';
import { TfIdf } from 'natural';
import { normalizeVector } from '../utils/similarity';

export class KMeansRecommender extends ClusteringRecommender {
  private readonly maxIterations: number;
  private readonly convergenceThreshold: number;
  private readonly contentRecommender: ContentBasedRecommender;
  private readonly useReviews: boolean;

  constructor(
    numClusters: number = 10,
    minClusterSize: number = 5,
    maxIterations: number = 100,
    convergenceThreshold: number = 0.001,
    useReviews: boolean = true
  ) {
    super(numClusters, minClusterSize);
    this.maxIterations = maxIterations;
    this.convergenceThreshold = convergenceThreshold;
    this.useReviews = useReviews;
    this.contentRecommender = new ContentBasedRecommender();
  }

  /**
   * Build feature vectors using TF-IDF on categories and reviews
   */
  protected async buildFeatureVectors(
    restaurants: Restaurant[],
    reviews: Review[]
  ): Promise<Map<string, number[]>> {
    const vectors = new Map<string, number[]>();
    const tfidf = new TfIdf();
    const terms = new Set<string>();

    // Group reviews by business
    const reviewsByBusiness = new Map<string, Review[]>();
    reviews.forEach(review => {
      if (!reviewsByBusiness.has(review.business_id)) {
        reviewsByBusiness.set(review.business_id, []);
      }
      reviewsByBusiness.get(review.business_id)!.push(review);
    });

    // First pass: collect all terms
    restaurants.forEach(restaurant => {
      let document = '';

      // Add categories if available
      if (restaurant.categories) {
        document += restaurant.categories.join(' ') + ' ';
      }

      // Add review text if enabled
      if (this.useReviews) {
        const businessReviews = reviewsByBusiness.get(restaurant.business_id) || [];
        document += businessReviews
          .map(review => review.review_text)
          .join(' ');
      }

      // Add document and collect terms
      const words = document.toLowerCase().split(/\W+/);
      words.forEach(word => {
        if (word.length > 2) {  // Skip very short words
          terms.add(word);
        }
      });
      tfidf.addDocument(words);
    });

    // Convert terms set to array for consistent indexing
    const termsList = Array.from(terms);

    // Second pass: build vectors
    restaurants.forEach((restaurant, index) => {
      const vector = new Array(termsList.length).fill(0);
      
      // Calculate TF-IDF for each term
      termsList.forEach((term, termIndex) => {
        const measure = tfidf.tfidf(term, index);
        vector[termIndex] = measure;
      });
      
      // Normalize vector
      vectors.set(restaurant.business_id, normalizeVector(vector));
    });

    return vectors;
  }

  /**
   * Run k-means clustering
   */
  protected async cluster(): Promise<void> {
    this.log('Starting k-means clustering...');
    let iteration = 0;
    let changed = true;

    while (changed && iteration < this.maxIterations) {
      // Assign points to nearest centroids
      changed = this.assignToClusters();

      // Update centroids
      this.updateCentroids();

      // Check cluster sizes
      let rebalanceNeeded = false;
      this.clusters.forEach((members, clusterId) => {
        if (members.size < this.minClusterSize) {
          this.log(`Cluster ${clusterId} is too small (${members.size} members)`, 'warning');
          rebalanceNeeded = true;
        }
      });

      // Rebalance clusters if needed
      if (rebalanceNeeded) {
        this.rebalanceClusters();
        changed = true;
      }

      iteration++;
      this.log(`Completed iteration ${iteration}, changed: ${changed}`);
    }

    this.log(`Clustering completed in ${iteration} iterations`);
  }

  /**
   * Rebalance clusters to ensure minimum size
   */
  private rebalanceClusters(): void {
    // Sort clusters by size
    const sortedClusters = Array.from(this.clusters.entries())
      .sort((a, b) => b[1].size - a[1].size);

    // Redistribute points from largest clusters to small ones
    for (let i = 0; i < sortedClusters.length; i++) {
      const [clusterId, members] = sortedClusters[i];
      if (members.size < this.minClusterSize) {
        // Find closest points from larger clusters
        const neededPoints = this.minClusterSize - members.size;
        const centroid = this.centroids.get(clusterId)!;
        
        // Collect candidates from larger clusters
        const candidates: { businessId: string; distance: number; sourceCluster: number }[] = [];
        
        for (let j = 0; j < i; j++) {
          const [largeClusterId, largeMembers] = sortedClusters[j];
          if (largeMembers.size > this.minClusterSize) {
            largeMembers.forEach(businessId => {
              const vector = this.businessVectors.get(businessId)!;
              const distance = this.calculateDistance(vector, centroid);
              candidates.push({ businessId, distance, sourceCluster: largeClusterId });
            });
          }
        }

        // Sort candidates by distance and move closest ones
        candidates.sort((a, b) => a.distance - b.distance);
        for (let k = 0; k < neededPoints && k < candidates.length; k++) {
          const { businessId, sourceCluster } = candidates[k];
          // Move point to new cluster
          this.clusters.get(sourceCluster)!.delete(businessId);
          this.clusters.get(clusterId)!.add(businessId);
          this.businessClusters.set(businessId, clusterId);
        }
      }
    }
  }

  /**
   * Get recommendations for a user
   */
  public async getRecommendations(
    userId: string,
    ratings: Rating[] = [],
    topN: number = 5
  ): Promise<RecommendationResult> {
    this.log(`Getting recommendations for user ${userId}`);

    try {
      // Find user's preferred clusters
      const clusterScores = new Map<number, number>();
      let totalRatings = 0;

      ratings.forEach(rating => {
        const clusterId = this.businessClusters.get(rating.business_id);
        if (clusterId !== undefined) {
          clusterScores.set(
            clusterId,
            (clusterScores.get(clusterId) || 0) + rating.rating
          );
          totalRatings++;
        }
      });

      // Normalize cluster scores
      clusterScores.forEach((score, clusterId) => {
        clusterScores.set(clusterId, score / totalRatings);
      });

      // Get recommendations from top clusters
      const recommendations: { businessId: string; score: number }[] = [];
      const ratedBusinessIds = new Set(ratings.map(r => r.business_id));

      // Sort clusters by score
      const sortedClusters = Array.from(clusterScores.entries())
        .sort((a, b) => b[1] - a[1]);

      // Get recommendations from each cluster proportionally
      for (const [clusterId, score] of sortedClusters) {
        const clusterMembers = this.clusters.get(clusterId)!;
        const numRecs = Math.ceil(topN * score);

        // Score items in cluster
        const clusterRecs = Array.from(clusterMembers)
          .filter(businessId => !ratedBusinessIds.has(businessId))
          .map(businessId => {
            const vector = this.businessVectors.get(businessId)!;
            const centroid = this.centroids.get(clusterId)!;
            const similarity = 1 - this.calculateDistance(vector, centroid);
            return { businessId, score: similarity * score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, numRecs);

        recommendations.push(...clusterRecs);
      }

      // Sort and take top N
      const topRecommendations = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, topN);

      return {
        recommendations: topRecommendations.map(r => r.businessId),
        scores: topRecommendations.map(r => r.score),
        explanation: `Recommendations based on your preferred restaurant clusters`,
        method: 'kmeans-clustering',
        logs: this.getFormattedLogs()
      };

    } catch (error) {
      this.log(`Error getting recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return {
        recommendations: [],
        scores: [],
        explanation: 'Failed to generate recommendations',
        method: 'kmeans-clustering',
        logs: this.getFormattedLogs()
      };
    }
  }

  /**
   * Get explanation for a recommendation
   */
  public async getRecommendationExplanation(
    userId: string,
    businessId: string
  ): Promise<string> {
    const clusterId = this.businessClusters.get(businessId);
    if (!clusterId) {
      return "This restaurant hasn't been categorized into any cluster.";
    }

    const cluster = this.clusters.get(clusterId)!;
    const vector = this.businessVectors.get(businessId)!;
    const centroid = this.centroids.get(clusterId)!;
    const similarity = 1 - this.calculateDistance(vector, centroid);

    let explanation = `This restaurant belongs to cluster ${clusterId} `;
    explanation += `which contains ${cluster.size} similar restaurants. `;
    explanation += `It's ${(similarity * 100).toFixed(1)}% similar to the typical `;
    explanation += `restaurant in this cluster.`;

    return explanation;
  }

  /**
   * Get the optimal number of clusters using the elbow method
   */
  public static async findOptimalK(
    restaurants: Restaurant[],
    reviews: Review[],
    maxK: number = 20,
    minK: number = 2
  ): Promise<{
    optimalK: number;
    scores: { k: number; score: number }[];
  }> {
    const scores: { k: number; score: number }[] = [];
    let prevScore = Infinity;
    let optimalK = minK;

    for (let k = minK; k <= maxK; k++) {
      const recommender = new KMeansRecommender(k);
      await recommender.initialize(restaurants, reviews);
      const stats = recommender.getStats();
      const score = stats.daviesBouldinIndex;
      scores.push({ k, score });

      // Check for elbow point
      const improvement = prevScore - score;
      if (improvement < 0.1 * prevScore) {
        optimalK = k;
        break;
      }
      prevScore = score;
    }

    return { optimalK, scores };
  }
}
