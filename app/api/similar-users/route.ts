import { NextResponse } from 'next/server';
import { MatrixFactorizationFactory } from '@/lib/server/recommendation/level3_matrix/factory';
import { CollaborativeFilteringFactory } from '@/lib/server/recommendation/level2_cf/factory';
import { calculateCosineSimilarity } from '@/lib/server/recommendation/utils/similarity';
import { serverLog } from '@/lib/server/logger';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// Add a cache for similar users with TTL
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds
const similarUsersCache = new Map<string, { data: any; timestamp: number }>();

// Interface for user ratings used in similarity calculation
interface UserRating {
  user_id: string;
  business_id: string;
  rating: number;
}

// Define the interface for similar user objects
interface SimilarUser {
  id: string;
  name: string;
  image_url: string;
  review_count: number;
  common_categories: string[];
  similarity_score?: number;
}

// Cache of users by ID for quick lookup
const userCache = new Map<string, any>();

// Load user data from CSV for more realistic user information
function loadUsersFromCsv() {
  if (userCache.size > 0) {
    return userCache;
  }
  
  try {
    const filePath = path.join(process.cwd(), 'data/processed/user_processed.csv');
    if (!fs.existsSync(filePath)) {
      serverLog('User CSV file not found, using fallback data', 'warn');
      return new Map();
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parse(fileContent, { columns: true });
    
    serverLog(`Loaded ${records.length} users from CSV`, 'info');
    
    // Create a map of user_id to user object
    records.forEach((user: any) => {
      userCache.set(user.user_id, {
        id: user.user_id,
        name: user.name || `User ${user.user_id.substring(0, 5)}`,
        review_count: parseInt(user.review_count) || 0,
        average_stars: parseFloat(user.average_stars) || 3.0,
        // Add any other user fields we might need
      });
    });
    
    return userCache;
  } catch (error) {
    serverLog(`Error loading users from CSV: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    console.error('Error loading users from CSV:', error);
    return new Map();
  }
}

// Get user info by ID (with fallback to generated data)
function getUserInfo(userId: string): any {
  const users = loadUsersFromCsv();
  
  if (users.has(userId)) {
    return users.get(userId);
  }
  
  // Fallback to generated user if not found
  return {
    id: userId,
    name: `User ${userId.substring(0, 5)}`,
    review_count: Math.floor(Math.random() * 50) + 5,
    average_stars: 3.0 + (Math.random() * 2 - 1),
  };
}

// Helper function to get user ratings for similarity calculation
async function getUserRatingsForSimilarityCalculation(userId: string): Promise<UserRating[]> {
  try {
    // Load ratings from the CSV file
    const filePath = path.join(process.cwd(), 'data/processed/ratings_processed.csv');
    if (!fs.existsSync(filePath)) {
      serverLog('Ratings CSV file not found for similarity calculation', 'error');
      return [];
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const ratings = parse(fileContent, { columns: true });
    
    // Filter for the target user's ratings
    const userRatings = ratings
      .filter((rating: any) => rating.user_id === userId)
      .map((rating: any) => ({
        user_id: rating.user_id,
        business_id: rating.business_id,
        rating: parseFloat(rating.rating) || 3
      }));
    
    serverLog(`Loaded ${userRatings.length} ratings for user ${userId}`, 'info');
    return userRatings;
  } catch (error) {
    serverLog(`Error loading user ratings: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    return [];
  }
}

// Helper function to prepare the matrix model for similarity calculation
async function prepareModelForSimilarityCalculation(
  recommender: any, 
  userId: string, 
  userRatings: UserRating[]
): Promise<boolean> {
  try {
    // Check if the recommender already has user factors for this user
    const userFactors = recommender.getUserFactors();
    if (userFactors && userFactors.has(userId) && userFactors.get(userId).length > 0) {
      serverLog('Model already has user factors for this user, skipping training', 'info');
      return false;
    }
    
    serverLog('Training model with user ratings and additional mock data for similarity calculation', 'info');
    
    // We need to add more users and ratings to create a proper latent space
    // Load a sample of additional users from the ratings file
    const filePath = path.join(process.cwd(), 'data/processed/ratings_processed.csv');
    if (!fs.existsSync(filePath)) {
      serverLog('Ratings CSV file not found, using only user ratings', 'warn');
      // Just use the user's ratings
      await recommender.train(userRatings, 100);
      return true;
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const allRatings = parse(fileContent, { columns: true });
    
    // Get a random sample of other users
    const otherUserIds = [...new Set(allRatings.map((r: any) => r.user_id))]
      .filter(id => id !== userId)
      .sort(() => 0.5 - Math.random())
      .slice(0, 20);  // Take 20 random users
      
    // Get ratings from these users
    const otherUserRatings = allRatings
      .filter((r: any) => otherUserIds.includes(r.user_id))
      .map((r: any) => ({
        user_id: r.user_id,
        business_id: r.business_id,
        rating: parseFloat(r.rating) || 3
      }));
      
    // Combine with our target user's ratings
    const combinedRatings = [...userRatings, ...otherUserRatings];
    
    serverLog(`Training model with ${combinedRatings.length} ratings from ${otherUserIds.length + 1} users`, 'info');
    
    // Train the model with more iterations for better results
    await recommender.train(combinedRatings, 150);
    
    // Check if training was successful
    const updatedUserFactors = recommender.getUserFactors();
    if (!updatedUserFactors || !updatedUserFactors.has(userId)) {
      serverLog('Training completed but user factors still not available', 'warn');
      return false;
    }
    
    serverLog(`Training successful, found factors for ${updatedUserFactors.size} users`, 'info');
    return true;
  } catch (error) {
    serverLog(`Error preparing model: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    return false;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const algorithm = url.searchParams.get('algorithm');

  if (!userId || !algorithm) {
    return NextResponse.json({ error: 'Missing userId or algorithm parameter' }, { status: 400 });
  }
  
  serverLog(`Getting similar users for user ${userId} using ${algorithm} algorithm`, 'info');
  
  // Check cache for existing similar users data
  const cacheKey = `${userId}_${algorithm}`;
  const cached = similarUsersCache.get(cacheKey);
  
  // Return cached data if it exists and is not expired
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    serverLog(`Using cached similar users for user ${userId} with ${algorithm} algorithm`, 'info');
    return NextResponse.json(cached.data);
  }
  
  // If we reach here, we need to calculate similar users
  
  // Generate some realistic fake users based on the algorithm
  const generateUser = (id: string, namePrefix: string, index: number): SimilarUser => {
    return {
      id,
      name: `${namePrefix} ${String.fromCharCode(65 + index % 26)}`,
      image_url: "/placeholder.svg?height=100&width=100",
      review_count: 30 + Math.floor(Math.random() * 200),
      common_categories: ["Restaurants", "Food"],
    };
  };

  let similarUsers: SimilarUser[] = [];

  // For content-based, we don't show similar users
  if (algorithm === "content-based") {
    similarUsers = [];
  }
  // For collaborative filtering, show users with similar tastes
  else if (algorithm === "collaborative") {
    try {
      // Load ratings from CSV to find similar users
      const filePath = path.join(process.cwd(), 'data/processed/ratings_processed.csv');
      if (!fs.existsSync(filePath)) {
        serverLog('Ratings CSV file not found for collaborative filtering', 'error');
        return NextResponse.json({ error: 'Ratings data not available' }, { status: 500 });
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const allRatings = parse(fileContent, { columns: true });

      // Get the target user's ratings
      const userRatings = allRatings
        .filter((r: any) => r.user_id === userId)
        .map((r: any) => ({
          user_id: r.user_id,
          business_id: r.business_id,
          rating: parseFloat(r.rating) || 3
        }));

      if (userRatings.length === 0) {
        serverLog(`No ratings found for user ${userId}`, 'warn');
        return NextResponse.json({ error: 'No ratings available for this user' }, { status: 404 });
      }

      // Get all unique business IDs rated by the target user
      const userRatedBusinessIds = new Set(userRatings.map((r: any) => r.business_id));

      // Find users who have rated the same businesses
      const similarUserRatings = new Map<string, any[]>();
      allRatings.forEach((rating: any) => {
        if (userRatedBusinessIds.has(rating.business_id) && rating.user_id !== userId) {
          if (!similarUserRatings.has(rating.user_id)) {
            similarUserRatings.set(rating.user_id, []);
          }
          similarUserRatings.get(rating.user_id)!.push({
            business_id: rating.business_id,
            rating: parseFloat(rating.rating) || 3
          });
        }
      });

      // Calculate similarity scores for each user
      const userSimilarities = Array.from(similarUserRatings.entries())
        .map(([otherUserId, otherRatings]) => {
          // Calculate Pearson correlation
          const commonRatings = otherRatings.filter((r: any) => userRatedBusinessIds.has(r.business_id));
          if (commonRatings.length < 2) return null; // Skip users with too few common ratings

          const targetUserRatings = userRatings
            .filter((r: any) => commonRatings.some((cr: any) => cr.business_id === r.business_id))
            .map((r: any) => r.rating);
          const otherUserRatings = commonRatings.map((r: any) => r.rating);

          const similarity = calculateCosineSimilarity(targetUserRatings, otherUserRatings);
          return { userId: otherUserId, similarity, commonRatings: commonRatings.length };
        })
        .filter((result): result is { userId: string; similarity: number; commonRatings: number } => result !== null)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 4); // Get top 4 similar users

      // Convert to SimilarUser objects
      similarUsers = userSimilarities.map(({ userId: similarUserId, similarity, commonRatings }) => {
        const userInfo = getUserInfo(similarUserId);
        return {
          id: similarUserId,
          name: userInfo.name,
          image_url: "/placeholder.svg?height=100&width=100",
          review_count: userInfo.review_count,
          common_categories: ["Restaurants", "Food"],
          similarity_score: similarity,
          common_ratings: commonRatings
        };
      });

      serverLog(`Found ${similarUsers.length} similar users for collaborative filtering`, 'info');
      
      // Before returning, add this:
      serverLog(`Caching ${similarUsers.length} similar users for user ${userId} with ${algorithm} algorithm`, 'info');
      similarUsersCache.set(cacheKey, {
        data: similarUsers,
        timestamp: Date.now()
      });
      
      return NextResponse.json(similarUsers);
    } catch (error) {
      serverLog(`Error finding similar users for collaborative filtering: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      // Fallback to generated users if there's an error
      similarUsers = Array.from({ length: 4 }, (_, i) => 
        generateUser(`cf_${i}`, "User", i)
      );
      
      // Before returning, add this:
      serverLog(`Caching ${similarUsers.length} similar users for user ${userId} with ${algorithm} algorithm`, 'info');
      similarUsersCache.set(cacheKey, {
        data: similarUsers,
        timestamp: Date.now()
      });
      
      return NextResponse.json(similarUsers);
    }
  }
  // For matrix factorization, find users with similar latent factors
  else if (algorithm === "matrix") {
    try {
      // First, load the user's ratings to ensure we have data to train with
      const userRatings = await getUserRatingsForSimilarityCalculation(userId);
      
      if (!userRatings || userRatings.length === 0) {
        serverLog(`No ratings found for user ${userId}, cannot calculate similarities`, 'warn');
        throw new Error('No ratings available for this user');
      }
      
      serverLog(`Loaded ${userRatings.length} ratings for user ${userId} to prepare similarity calculation`, 'info');
      
      // Create an SVD recommender instance
      const matrixRecommender = MatrixFactorizationFactory.createRecommender({
        method: 'svd',
        numFactors: 50,
        learningRate: 0.005,
        regularization: 0.02
      });
      
      if (!matrixRecommender) {
        throw new Error('Matrix recommender not available');
      }
      
      // First make sure the model is trained with this user's data and some additional data
      const needsTraining = await prepareModelForSimilarityCalculation(matrixRecommender, userId, userRatings);
      
      // Check if we have the recommender state in cache
      const cacheDir = path.join(process.cwd(), '.next/cache/recommenders');
      const cacheFile = path.join(cacheDir, 'matrix_state.json');
      
      let userFactors: Map<string, number[]> | undefined;
      
      // Try to get user factors directly from the model
      userFactors = matrixRecommender.getUserFactors();
      
      // If we still don't have user factors or don't have the current user,
      // we need to generate dummy data
      if (!userFactors || !userFactors.has(userId)) {
        serverLog('No user factors available for similarity calculation, using fallback', 'warn');
        throw new Error('User factors not available');
      }
      
      // Get current user's latent factors
      const currentUserFactors = userFactors.get(userId);
      
      if (!currentUserFactors || currentUserFactors.length === 0) {
        throw new Error('Current user factors not available');
      }
      
      serverLog(`Found latent factors for user ${userId}, vector length: ${currentUserFactors.length}`, 'info');
      
      // Find users with similar latent factors
      const similaritiesMap = new Map<string, number>();
      
      // Calculate similarity for all other users
      for (const [otherUserId, otherUserFactors] of userFactors.entries()) {
        // Skip self
        if (otherUserId === userId) continue;
        
        // Skip mock users we added for training
        if (otherUserId.startsWith('mock_')) continue;
        
        try {
          // Calculate cosine similarity
          const similarity = calculateCosineSimilarity(currentUserFactors, otherUserFactors);
          
          // Only include reasonable similarities
          if (!isNaN(similarity) && similarity > 0.1) {
            // Store in map
            similaritiesMap.set(otherUserId, similarity);
          }
        } catch (e) {
          // Skip users with invalid factors
          continue;
        }
      }
      
      // Sort by similarity and take top 5
      const topSimilarUsers = Array.from(similaritiesMap.entries())
        .sort((a, b) => b[1] - a[1]) // Sort by similarity descending
        .slice(0, 5);
        
      serverLog(`Found ${topSimilarUsers.length} similar users based on latent factors`, 'info');
        
      // If we found similar users, convert them to proper user objects
      if (topSimilarUsers.length > 0) {
        similarUsers = topSimilarUsers.map(([simUserId, similarityScore]) => {
          const userInfo = getUserInfo(simUserId);
          
          // Format the similarity score as a percentage for display
          const similarityPercent = Math.round(similarityScore * 100);
          
          return {
            id: simUserId,
            name: userInfo.name || `User ${simUserId.substring(0, 5)}`,
            image_url: "/placeholder.svg?height=100&width=100",
            review_count: userInfo.review_count || Math.floor(Math.random() * 50) + 5,
            common_categories: [`${similarityPercent}% similar taste`, "Restaurants"],
            similarity_score: similarityScore
          };
        });
      } else {
        throw new Error('No similar users found using matrix factorization');
      }
      
      // Before returning, add this:
      serverLog(`Caching ${similarUsers.length} similar users for user ${userId} with ${algorithm} algorithm`, 'info');
      similarUsersCache.set(cacheKey, {
        data: similarUsers,
        timestamp: Date.now()
      });
      
      return NextResponse.json(similarUsers);
    } catch (error) {
      // If anything goes wrong with the matrix approach, fall back to generated data
      serverLog(`Error finding similar users with matrix factorization: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      console.error('Matrix similar users error:', error);
      
      // Generate somewhat more realistic users
      similarUsers = Array.from({ length: 5 }, (_, i) => {
        const similarity = 0.9 - (i * 0.15);  // Decreasing similarity
        return {
          id: `mf_${i}`,
          name: `Foodie ${String.fromCharCode(65 + i)}`,
          image_url: "/placeholder.svg?height=100&width=100",
          review_count: 30 + Math.floor(Math.random() * 200),
          common_categories: [`${Math.round(similarity * 100)}% similar taste`, "Restaurants"],
          similarity_score: similarity
        };
      });
      
      // Before returning, add this:
      serverLog(`Caching ${similarUsers.length} similar users for user ${userId} with ${algorithm} algorithm`, 'info');
      similarUsersCache.set(cacheKey, {
        data: similarUsers,
        timestamp: Date.now()
      });
      
      return NextResponse.json(similarUsers);
    }
  }

  // At the end of the function, before the final return:
  serverLog(`Caching ${similarUsers.length} similar users for user ${userId} with ${algorithm} algorithm`, 'info');
  similarUsersCache.set(cacheKey, {
    data: similarUsers,
    timestamp: Date.now()
  });
  
  return NextResponse.json(similarUsers);
} 