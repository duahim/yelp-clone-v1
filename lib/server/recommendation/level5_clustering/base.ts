import { 
  Restaurant,
  Review,
  Rating,
  ClusteringResult,
  RecommendationResult,
  LogEntry
} from '../types';
import { normalizeVector, calculateCosineSimilarity } from '../utils/similarity';

export abstract class ClusteringRecommender {
  protected clusters: Map<number, Set<string>>;  // cluster_id -> set of business_ids
  protected centroids: Map<number, number[]>;    // cluster_id -> centroid vector
  protected businessVectors: Map<string, number[]>;  // business_id -> feature vector
  protected businessClusters: Map<string, number>;   // business_id -> cluster_id
  protected logs: LogEntry[];
  protected readonly numClusters: number;
  protected readonly minClusterSize: number;

  constructor(
    numClusters: number = 10,
    minClusterSize: number = 5
  ) {
    this.numClusters = numClusters;
    this.minClusterSize = minClusterSize;
    this.clusters = new Map();
    this.centroids = new Map();
    this.businessVectors = new Map();
    this.businessClusters = new Map();
    this.logs = [];
  }

  protected log(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    this.logs.push({ timestamp, message, level });
  }

  /**
   * Convert log entries to formatted strings
   */
  protected getFormattedLogs(): string[] {
    return this.getLogs().map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    );
  }

  /**
   * Build feature vectors for restaurants
   */
  protected abstract buildFeatureVectors(
    restaurants: Restaurant[],
    reviews: Review[]
  ): Promise<Map<string, number[]>>;

  /**
   * Initialize clusters with random centroids
   */
  protected initializeClusters(vectors: Map<string, number[]>): void {
    this.clusters.clear();
    this.centroids.clear();
    this.businessClusters.clear();

    const allBusinessIds = Array.from(vectors.keys());
    const vectorDimension = vectors.get(allBusinessIds[0])!.length;

    // Initialize empty clusters
    for (let i = 0; i < this.numClusters; i++) {
      this.clusters.set(i, new Set());
    }

    // Initialize centroids with random vectors
    for (let i = 0; i < this.numClusters; i++) {
      const centroid = new Array(vectorDimension);
      for (let j = 0; j < vectorDimension; j++) {
        centroid[j] = Math.random();
      }
      this.centroids.set(i, normalizeVector(centroid));
    }
  }

  /**
   * Calculate distance between two vectors
   */
  protected calculateDistance(vector1: number[], vector2: number[]): number {
    return 1 - calculateCosineSimilarity(vector1, vector2);
  }

  /**
   * Assign businesses to nearest cluster
   */
  protected assignToClusters(): boolean {
    let changed = false;
    
    this.businessVectors.forEach((vector, businessId) => {
      // Find nearest centroid
      let minDistance = Infinity;
      let nearestCluster = -1;

      this.centroids.forEach((centroid, clusterId) => {
        const distance = this.calculateDistance(vector, centroid);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCluster = clusterId;
        }
      });

      // Update cluster assignment if changed
      const currentCluster = this.businessClusters.get(businessId);
      if (currentCluster !== nearestCluster) {
        if (currentCluster !== undefined) {
          this.clusters.get(currentCluster)?.delete(businessId);
        }
        this.clusters.get(nearestCluster)?.add(businessId);
        this.businessClusters.set(businessId, nearestCluster);
        changed = true;
      }
    });

    return changed;
  }

  /**
   * Update centroids based on cluster members
   */
  protected updateCentroids(): void {
    this.clusters.forEach((members, clusterId) => {
      if (members.size === 0) {
        // Handle empty cluster
        const dimension = this.centroids.get(clusterId)!.length;
        const newCentroid = new Array(dimension).fill(0);
        this.centroids.set(clusterId, newCentroid);
        return;
      }

      // Calculate mean of all vectors in cluster
      const dimension = this.businessVectors.get(Array.from(members)[0])!.length;
      const sum = new Array(dimension).fill(0);
      
      members.forEach(businessId => {
        const vector = this.businessVectors.get(businessId)!;
        for (let i = 0; i < dimension; i++) {
          sum[i] += vector[i];
        }
      });

      const newCentroid = sum.map(val => val / members.size);
      this.centroids.set(clusterId, normalizeVector(newCentroid));
    });
  }

  /**
   * Get cluster quality metrics
   */
  protected getClusterMetrics(): {
    silhouetteScore: number;
    daviesBouldinIndex: number;
  } {
    // Calculate silhouette score
    let totalSilhouette = 0;
    let count = 0;

    this.businessVectors.forEach((vector, businessId) => {
      const clusterId = this.businessClusters.get(businessId)!;
      const clusterMembers = this.clusters.get(clusterId)!;

      // Calculate average distance to own cluster (a)
      let intraClusterDist = 0;
      clusterMembers.forEach(otherId => {
        if (otherId !== businessId) {
          const otherVector = this.businessVectors.get(otherId)!;
          intraClusterDist += this.calculateDistance(vector, otherVector);
        }
      });
      const a = clusterMembers.size > 1 
        ? intraClusterDist / (clusterMembers.size - 1)
        : 0;

      // Calculate minimum average distance to other clusters (b)
      let minInterClusterDist = Infinity;
      this.clusters.forEach((otherMembers, otherClusterId) => {
        if (otherClusterId !== clusterId && otherMembers.size > 0) {
          let clusterDist = 0;
          otherMembers.forEach(otherId => {
            const otherVector = this.businessVectors.get(otherId)!;
            clusterDist += this.calculateDistance(vector, otherVector);
          });
          const avgDist = clusterDist / otherMembers.size;
          minInterClusterDist = Math.min(minInterClusterDist, avgDist);
        }
      });
      const b = minInterClusterDist;

      // Calculate silhouette coefficient
      if (clusterMembers.size > 1) {
        const silhouette = (b - a) / Math.max(a, b);
        totalSilhouette += silhouette;
        count++;
      }
    });

    const silhouetteScore = count > 0 ? totalSilhouette / count : 0;

    // Calculate Davies-Bouldin index
    let dbSum = 0;
    let dbCount = 0;

    this.clusters.forEach((members, i) => {
      if (members.size === 0) return;

      let maxRatio = 0;
      this.clusters.forEach((otherMembers, j) => {
        if (i !== j && otherMembers.size > 0) {
          const centroid1 = this.centroids.get(i)!;
          const centroid2 = this.centroids.get(j)!;
          const centerDist = this.calculateDistance(centroid1, centroid2);

          // Calculate average distances to centroids
          let scatter1 = 0, scatter2 = 0;
          members.forEach(businessId => {
            const vector = this.businessVectors.get(businessId)!;
            scatter1 += this.calculateDistance(vector, centroid1);
          });
          otherMembers.forEach(businessId => {
            const vector = this.businessVectors.get(businessId)!;
            scatter2 += this.calculateDistance(vector, centroid2);
          });
          scatter1 /= members.size;
          scatter2 /= otherMembers.size;

          const ratio = (scatter1 + scatter2) / centerDist;
          maxRatio = Math.max(maxRatio, ratio);
        }
      });

      dbSum += maxRatio;
      dbCount++;
    });

    const daviesBouldinIndex = dbCount > 0 ? dbSum / dbCount : 0;

    return {
      silhouetteScore,
      daviesBouldinIndex
    };
  }

  /**
   * Initialize the recommender with data
   */
  public async initialize(
    restaurants: Restaurant[],
    reviews: Review[]
  ): Promise<void> {
    this.log('Initializing clustering recommender...');

    try {
      // Build feature vectors
      this.businessVectors = await this.buildFeatureVectors(restaurants, reviews);
      this.log(`Built feature vectors for ${this.businessVectors.size} restaurants`);

      // Initialize clusters
      this.initializeClusters(this.businessVectors);
      this.log(`Initialized ${this.numClusters} clusters`);

      // Run clustering algorithm
      await this.cluster();
      this.log('Clustering completed');

      // Calculate quality metrics
      const metrics = this.getClusterMetrics();
      this.log(`Clustering metrics - Silhouette: ${metrics.silhouetteScore.toFixed(3)}, ` +
               `Davies-Bouldin: ${metrics.daviesBouldinIndex.toFixed(3)}`);

    } catch (error) {
      this.log(`Initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }

  /**
   * Run the clustering algorithm
   */
  protected abstract cluster(): Promise<void>;

  /**
   * Get recommendations for a user
   */
  public abstract getRecommendations(
    userId: string,
    ratings?: Rating[],
    topN?: number
  ): Promise<RecommendationResult>;

  /**
   * Get explanation for a recommendation
   */
  public abstract getRecommendationExplanation(
    userId: string,
    businessId: string
  ): Promise<string>;

  /**
   * Get the logs
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
   * Get clustering results
   */
  public getClusteringResults(): ClusteringResult[] {
    return Array.from(this.clusters.entries()).map(([clusterId, members]) => ({
      cluster_id: clusterId,
      cluster_members: Array.from(members),
      centroid: this.centroids.get(clusterId)!
    }));
  }

  /**
   * Get statistics about the clustering
   */
  public getStats(): {
    numClusters: number;
    clusterSizes: number[];
    avgClusterSize: number;
    silhouetteScore: number;
    daviesBouldinIndex: number;
  } {
    const clusterSizes = Array.from(this.clusters.values())
      .map(members => members.size);
    
    const metrics = this.getClusterMetrics();

    return {
      numClusters: this.numClusters,
      clusterSizes,
      avgClusterSize: clusterSizes.reduce((a, b) => a + b, 0) / this.numClusters,
      silhouetteScore: metrics.silhouetteScore,
      daviesBouldinIndex: metrics.daviesBouldinIndex
    };
  }
}
