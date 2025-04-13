import { NextResponse } from 'next/server';
import { ContentBasedRecommenderFactory } from '@/lib/server/recommendation/level1_content/factory';
import { CollaborativeFilteringFactory } from '@/lib/server/recommendation/level2_cf/factory';
import { MatrixFactorizationFactory } from '@/lib/server/recommendation/level3_matrix/factory';
import { ItemBasedCFRecommender } from '@/lib/server/recommendation/level2_cf/item-based';
import { RECOMMENDATION_CONFIG } from '@/config/recommendations';
import { log } from '@/lib/server/recommendation/utils/logger';
import { fetchRestaurants } from '@/data/restaurantsFromCsv';
import { Restaurant as ClientRestaurant } from '@/data/restaurantsFromCsv';
import { Restaurant as ServerRestaurant, Review as ServerReview, Rating } from '@/lib/server/recommendation/types';
import { serverLog, logSessionStart } from '@/lib/server/logger';
import { loadRestaurantsFromCsv } from '@/lib/server/loadRestaurantData';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { 
  initCacheDirectories,
  getCachedRecommendations,
  cacheRecommendations
} from '@/lib/server/recommendation/utils/cache';

// Initialize recommenders at module level
const contentRecommender = ContentBasedRecommenderFactory.createRecommender({method: 'tfidf'});
const collaborativeRecommender = CollaborativeFilteringFactory.createRecommender({
  method: 'user-based',
  minRatings: RECOMMENDATION_CONFIG.collaborative.minCommonRatings,
  minSimilarUsers: 3,
  ratingThreshold: RECOMMENDATION_CONFIG.defaultRating
});
const matrixRecommender = MatrixFactorizationFactory.createRecommender({
  method: 'svd',
  numFactors: RECOMMENDATION_CONFIG.matrix.numFactors,
  learningRate: RECOMMENDATION_CONFIG.matrix.learningRate,
  regularization: RECOMMENDATION_CONFIG.matrix.regularization
});

// Initialize cache directories on startup
initCacheDirectories();

// Convert client restaurant to server restaurant
function convertToServerRestaurant(clientRestaurant: ClientRestaurant): ServerRestaurant {
  return {
    business_id: clientRestaurant.id,
    name: clientRestaurant.name,
    review_text: clientRestaurant.reviews.map(r => r.text).join(' '),
    categories: clientRestaurant.categories
  };
}

// Build item profiles for content-based recommender
async function initializeContentRecommender() {
  try {
    serverLog('Initializing content-based recommender', 'info');
    // Get all restaurants from the API
    const clientRestaurants = await fetchRestaurants();
    if (!clientRestaurants || clientRestaurants.length === 0) {
      serverLog('No restaurants loaded from API', 'error');
      log(3, 'No restaurants loaded from API');
      return;
    }
    serverLog(`Loaded ${clientRestaurants.length} restaurants from API`, 'info');
    log(3, `Loaded ${clientRestaurants.length} restaurants from API`);
    
    // Convert to server format
    const serverRestaurants = clientRestaurants.map(convertToServerRestaurant);
    
    // Extract reviews from restaurants
    const serverReviews: ServerReview[] = [];
    clientRestaurants.forEach(restaurant => {
      if (restaurant.reviews && restaurant.reviews.length > 0) {
        restaurant.reviews.forEach(review => {
          serverReviews.push({
            business_id: restaurant.id,
            user_id: review.user.id,
            review_text: review.text,
            rating: review.rating
          });
        });
      }
    });
    
    serverLog(`Extracted ${serverReviews.length} reviews from restaurants`, 'info');
    log(1, `Extracted ${serverReviews.length} reviews from restaurants`);
    
    // Build item profiles
    serverLog('Building item profiles for content-based recommender', 'info');
    await contentRecommender.buildItemProfiles(serverRestaurants, serverReviews);
    serverLog('Item profiles built successfully for content-based recommender', 'info');
    log(1, `Built item profiles for content-based recommender`);
  } catch (error) {
    serverLog(`Error building item profiles: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    log(3, `Error building item profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Error building item profiles:', error);
  }
}

// Initialize the content recommender when the module loads
initializeContentRecommender();

// Load all businesses from CSV without filtering for restaurants only
function loadAllBusinessesFromCsv() {
  try {
    // Read the CSV file
    const filePath = path.join(process.cwd(), 'data/processed/business_processed.csv');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse the CSV content
    const records = parse(fileContent, { columns: true });
    
    serverLog(`Read ${records.length} total business records from CSV for hydration`, 'info');
    
    // Transform all business records to objects with consistent IDs
    return records.map((record: any) => {
      // Extract categories array
      let categories = [];
      try {
        if (record.categories_list && record.categories_list !== '[]') {
          // Remove the brackets and split by commas
          const categoriesStr = record.categories_list
            .replace('[', '')
            .replace(']', '')
            .replace(/'/g, '');
          categories = categoriesStr.split(',').map((cat: string) => cat.trim());
        }
      } catch (error) {
        console.error("Error parsing categories:", error);
      }
      
      // Create a business object with normalized fields
      return {
        id: record.business_id,
        business_id: record.business_id,
        name: record.name || "Unknown Business",
        image_url: "/placeholder.svg?height=400&width=600",
        url: `https://www.example.com/${record.business_id || ""}`,
        review_count: parseInt(record.review_count) || 0,
        rating: parseFloat(record.stars) || 0,
        coordinates: {
          latitude: parseFloat(record.latitude) || 0,
          longitude: parseFloat(record.longitude) || 0,
        },
        price: "$$", // Default price, as it's not in the data
        location: {
          address1: "",
          address2: "",
          address3: "",
          city: record.city || "",
          zip_code: "",
          country: "US",
          state: record.state || "",
          display_address: [record.city || "", record.state || ""].filter(Boolean),
        },
        categories: categories,
        description: `${record.name} is located in ${record.city || ""}, ${record.state || ""}`.trim(),
      };
    });
  } catch (error) {
    serverLog(`Error loading all businesses from CSV: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    console.error("Error loading all businesses from CSV:", error);
    return [];
  }
}

export async function POST(request: Request) {
  try {
    logSessionStart();
    serverLog('POST request to recommendations API', 'info');
    
    const body = await request.json();
    const { userId, algorithm, userRatings, forceRefresh } = body;

    // Validate input
    if (!userId || !algorithm || !userRatings) {
      serverLog(`Missing required parameters: userId=${!!userId}, algorithm=${!!algorithm}, userRatings=${!!userRatings}`, 'error');
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    serverLog(`Processing request for user ${userId} with algorithm ${algorithm}`, 'info');
    serverLog(`User ratings count: ${userRatings.length}`, 'info');

    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      serverLog(`Checking cache for user ${userId} with algorithm ${algorithm}`, 'info');
      const cachedData = getCachedRecommendations(userId, algorithm);
      if (cachedData) {
        // Check cache age (invalidate after 24 hours)
        const cacheAge = new Date().getTime() - new Date(cachedData.cachedAt).getTime();
        const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        serverLog(`Cache age: ${cacheAge}ms, Max age: ${maxCacheAge}ms`, 'info');
        
        if (cacheAge < maxCacheAge) {
          serverLog(`Using cached recommendations for user ${userId} using ${algorithm} algorithm`, 'info');
          return NextResponse.json({
            ...cachedData,
            fromCache: true
          });
        } else {
          serverLog(`Cache expired for user ${userId} using ${algorithm} algorithm`, 'info');
        }
      } else {
        serverLog(`No cache found for user ${userId} using ${algorithm} algorithm`, 'info');
      }
    } else {
      serverLog(`Force refresh requested for user ${userId} using ${algorithm} algorithm`, 'info');
    }
    
    serverLog(`Processing recommendations for user ${userId} using ${algorithm} algorithm`, 'info');
    serverLog(`User ratings: ${JSON.stringify(userRatings)}`, 'debug');
    log(1, `Processing recommendations for user ${userId} using ${algorithm} algorithm`);

    // Check if refresh is forced (e.g., after login)
    if (!forceRefresh) {
      // Check for cached recommendations
      const cachedResult = getCachedRecommendations(userId, algorithm);
      if (cachedResult) {
        serverLog(`Using cached recommendations for user ${userId} with ${algorithm} algorithm`, 'info');
        return NextResponse.json({
          ...cachedResult,
          fromCache: true
        });
      }
    } else {
      serverLog(`Force refreshing recommendations for user ${userId}`, 'info');
    }
    
    let result;
    switch (algorithm) {
      case "content-based": {
        // Make sure item profiles are built
        serverLog('Using content-based algorithm', 'info');
        await initializeContentRecommender();
        
        // Log the structure of the first few userRatings to help debug
        if (userRatings && userRatings.length > 0) {
          serverLog(`Sample userRating: ${JSON.stringify(userRatings[0])}`, 'debug');
        }
        
        serverLog('Getting content-based recommendations', 'info');
        result = await contentRecommender.getRecommendations(
          userId,
          new Map(userRatings.map((r: any) => [r.business_id || r.restaurant_id, r.rating])),
          RECOMMENDATION_CONFIG.recommendationsPerPage
        );
        
        // Filter out businesses that the user has already liked
        const likedBusinessIds = new Set(userRatings.map((r: any) => r.business_id || r.restaurant_id));
        serverLog(`Filtering out ${likedBusinessIds.size} already liked businesses from content-based recommendations`, 'info');
        
        // Filter recommendations to exclude already liked items
        if (Array.isArray(result.recommendations)) {
          const originalCount = result.recommendations.length;
          result.recommendations = result.recommendations.filter((rec: any) => {
            // Handle string IDs or object IDs
            const recId = typeof rec === 'string' ? rec : (rec.business_id || rec.id);
            return !likedBusinessIds.has(recId);
          });
          serverLog(`Filtered out ${originalCount - result.recommendations.length} already liked items from content-based recommendations`, 'info');
        }
        break;
      }
      
      case "collaborative": {
        serverLog('Using collaborative filtering algorithm', 'info');
        
        // First, get all businesses rated by the target user
        const userRatedBusinessIds = new Set(userRatings.map((r: any) => r.business_id));
        serverLog(`Target user has rated ${userRatedBusinessIds.size} businesses`, 'info');
        
        // Load ratings from CSV to find similar users
        const filePath = path.join(process.cwd(), 'data/processed/ratings_processed.csv');
        if (!fs.existsSync(filePath)) {
          serverLog('Ratings CSV file not found', 'error');
          return NextResponse.json({ 
            success: false, 
            error: 'Ratings data not available',
            logs: []
          });
        }
        
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const allRatings = parse(fileContent, { columns: true });
        
        // Find users who have rated the same businesses as our target user
        const similarUserIds = new Set<string>();
        const userBusinessRatings = new Map<string, Set<string>>(); // user_id -> Set<business_id>
        
        // First pass: find users who have rated the same businesses
        allRatings.forEach((rating: any) => {
          if (userRatedBusinessIds.has(rating.business_id)) {
            similarUserIds.add(rating.user_id);
            if (!userBusinessRatings.has(rating.user_id)) {
              userBusinessRatings.set(rating.user_id, new Set());
            }
            userBusinessRatings.get(rating.user_id)!.add(rating.business_id);
          }
        });
        
        // Sort similar users by number of common ratings and take top N
        const topSimilarUsers = Array.from(similarUserIds)
          .map(userId => ({
            userId,
            commonRatings: userBusinessRatings.get(userId)!.size
          }))
          .sort((a, b) => b.commonRatings - a.commonRatings)
          .slice(0, 20) // Reduced from 50 to 20 similar users
          .map(u => u.userId);
        
        serverLog(`Found ${topSimilarUsers.length} most similar users`, 'info');
        
        // Second pass: collect ratings from similar users (including their ratings for businesses the target user has rated)
        const relevantRatings: any[] = [];
        const unratedBusinessIds = new Set<string>();
        
        // First add the target user's ratings
        userRatings.forEach((rating: any) => {
          relevantRatings.push({
            user_id: userId,
            business_id: rating.business_id,
            rating: parseFloat(rating.rating) || 3
          });
        });
        
        // Then add ratings from similar users, with a limit
        let ratingsCount = 0;
        const MAX_RATINGS = 2000; // Limit total ratings to 1000
        allRatings.forEach((rating: any) => {
          if (ratingsCount >= MAX_RATINGS) return;
          if (topSimilarUsers.includes(rating.user_id)) {
            relevantRatings.push({
              user_id: rating.user_id,
              business_id: rating.business_id,
              rating: parseFloat(rating.rating) || 3
            });
            if (!userRatedBusinessIds.has(rating.business_id)) {
              unratedBusinessIds.add(rating.business_id);
            }
            ratingsCount++;
          }
        });
        
        serverLog(`Loaded ${relevantRatings.length} relevant ratings (${userRatings.length} from target user + ${relevantRatings.length - userRatings.length} from similar users) for ${unratedBusinessIds.size} unrated businesses`, 'info');
        
        // Initialize collaborative recommender with all relevant ratings
        await collaborativeRecommender.initialize(relevantRatings);
        
        serverLog('Getting collaborative recommendations', 'info');
        result = await collaborativeRecommender.getRecommendations(
          userId,
          RECOMMENDATION_CONFIG.recommendationsPerPage
        );
        
        // If user-based CF returned no recommendations, try item-based as fallback
        if (result.recommendations.length === 0) {
          serverLog('User-based CF returned no recommendations, trying item-based CF as fallback', 'info');
          
          // Create an item-based recommender
          const itemBasedRecommender = new ItemBasedCFRecommender(
            1, // Reduce minRatings to 1 for fallback
            2, // Reduce minSimilarItems to 2
            RECOMMENDATION_CONFIG.defaultRating
          );
          
          // Initialize with all ratings (target user + similar users)
          await itemBasedRecommender.initialize(relevantRatings);
          
          // Get recommendations
          const itemBasedResult = await itemBasedRecommender.getRecommendations(
            userId,
            RECOMMENDATION_CONFIG.recommendationsPerPage
          );
          
          if (itemBasedResult.recommendations.length > 0) {
            serverLog(`Item-based fallback found ${itemBasedResult.recommendations.length} recommendations`, 'info');
            
            // Combine the explanation to inform about the fallback
            itemBasedResult.explanation = `Using item-based collaborative filtering as a fallback: ${itemBasedResult.explanation}`;
            
            // Update result with item-based recommendations
            result = itemBasedResult;
          } else {
            serverLog('Item-based fallback also returned no recommendations', 'info');
          }
        }
        
        // Filter out businesses that the user has already liked
        const likedBusinessIds = new Set(userRatings.map((r: any) => r.business_id));
        serverLog(`Filtering out ${likedBusinessIds.size} already liked businesses from collaborative recommendations`, 'info');
        
        // Filter recommendations to exclude already liked items
        if (Array.isArray(result.recommendations)) {
          const originalCount = result.recommendations.length;
          result.recommendations = result.recommendations.filter((rec: any) => {
            // Handle string IDs or object IDs
            const recId = typeof rec === 'string' ? rec : (rec.business_id || rec.id);
            return !likedBusinessIds.has(recId);
          });
          serverLog(`Filtered out ${originalCount - result.recommendations.length} already liked items from collaborative recommendations`, 'info');
        }
        break;
      }
      
      case "matrix": {
        serverLog('Using matrix factorization algorithm', 'info');
        serverLog(`Training matrix recommender with ${userRatings.length} ratings`, 'info');
        
        try {
          // CRITICAL FIX: The SVD model needs more item data than just the user's ratings
          // Let's load all businesses to enhance our item universe
          const allBusinesses = loadAllBusinessesFromCsv();
          serverLog(`Loaded ${allBusinesses.length} total businesses for training enhancement`, 'info');
          
          // Generate training data with additional ratings to expand the item universe
          const additionalRatings: Rating[] = [];
          
          // Get the businesses the user has already rated
          const userRatedBusinessIds = new Set(userRatings.map((r: any) => r.business_id));
          serverLog(`User has rated ${userRatedBusinessIds.size} businesses`, 'info');
          
          // Now do a more strategic selection of unrated businesses to include
          // We want to include diverse businesses across different categories and locations
          
          // Group all businesses by category for more diverse sampling
          const categoriesMap = new Map<string, any[]>();
          const citiesMap = new Map<string, any[]>();
          
          // Process all businesses to create category and city maps
          allBusinesses.forEach((business: any) => {
            // Skip businesses the user has already rated
            if (userRatedBusinessIds.has(business.business_id)) return;
            
            // Add to categories map
            if (business.categories && business.categories.length > 0) {
              business.categories.forEach((category: string) => {
                if (!categoriesMap.has(category)) {
                  categoriesMap.set(category, []);
                }
                categoriesMap.get(category)!.push(business);
              });
            }
            
            // Add to cities map
            const city = business.location?.city || "Unknown";
            if (!citiesMap.has(city)) {
              citiesMap.set(city, []);
            }
            citiesMap.get(city)!.push(business);
          });
          
          // Get a diverse set of businesses by taking some from each category
          const selectedBusinesses = new Set<string>();
          
          // First, select businesses from the same categories as what the user has liked
          const userLikedCategories = new Set<string>();
          userRatings.forEach((rating: any) => {
            const business = allBusinesses.find((b: any) => b.business_id === rating.business_id);
            if (business && business.categories) {
              business.categories.forEach((category: string) => userLikedCategories.add(category));
            }
          });
          
          serverLog(`User has liked businesses in ${userLikedCategories.size} categories`, 'info');
          
          // Select some businesses from each category the user has liked
          userLikedCategories.forEach(category => {
            const businessesInCategory = categoriesMap.get(category) || [];
            
            // Take up to 5 businesses from each category
            const samplesToTake = Math.min(5, businessesInCategory.length);
            for (let i = 0; i < samplesToTake; i++) {
              const randomIndex = Math.floor(Math.random() * businessesInCategory.length);
              const business = businessesInCategory[randomIndex];
              selectedBusinesses.add(business.business_id);
              // Remove this business to avoid duplicates
              businessesInCategory.splice(randomIndex, 1);
            }
          });
          
          // Now add some businesses from a variety of other categories for diversity
          const otherCategories = Array.from(categoriesMap.keys())
            .filter(category => !userLikedCategories.has(category))
            .sort(() => Math.random() - 0.5) // Shuffle
            .slice(0, 30); // Take 30 random categories
            
          otherCategories.forEach(category => {
            const businessesInCategory = categoriesMap.get(category) || [];
            if (businessesInCategory.length > 0) {
              const randomIndex = Math.floor(Math.random() * businessesInCategory.length);
              const business = businessesInCategory[randomIndex];
              selectedBusinesses.add(business.business_id);
            }
          });
          
          // Finally add some businesses from different cities for geographic diversity
          const cities = Array.from(citiesMap.keys())
            .sort(() => Math.random() - 0.5) // Shuffle
            .slice(0, 20); // Take 20 random cities
            
          cities.forEach(city => {
            const businessesInCity = citiesMap.get(city) || [];
            if (businessesInCity.length > 0) {
              const randomIndex = Math.floor(Math.random() * businessesInCity.length);
              const business = businessesInCity[randomIndex];
              selectedBusinesses.add(business.business_id);
            }
          });
          
          serverLog(`Selected ${selectedBusinesses.size} diverse businesses for training enhancement`, 'info');
          
          // Add ratings from mock users for these businesses
          // We'll use 3 different mock users with different preferences to create more patterns
          const mockUsers = ['mock_user_positive', 'mock_user_neutral', 'mock_user_negative'];
          const mockUserBias = [4.5, 3, 1.5]; // Different baseline ratings to create patterns
          
          Array.from(selectedBusinesses).forEach((businessId, index) => {
            // Calculate which mock user should rate this business (round robin)
            const mockUserIndex = index % mockUsers.length;
            const mockUserId = mockUsers[mockUserIndex];
            const baseBias = mockUserBias[mockUserIndex];
            
            // Add some random variance [-0.5, 0.5] to make it more realistic
            const rating = Math.max(1, Math.min(5, baseBias + (Math.random() - 0.5)));
            
            additionalRatings.push({
              user_id: mockUserId,
              business_id: businessId,
              rating
            });
          });
          
          serverLog(`Added ${additionalRatings.length} additional ratings from ${mockUsers.length} mock users`, 'info');
          
          // Train the model with combined ratings: user's actual ratings + the additional item coverage
          const combinedRatings = [...userRatings, ...additionalRatings];
          serverLog(`Training matrix recommender with expanded dataset of ${combinedRatings.length} ratings`, 'info');
          
          await matrixRecommender.train(combinedRatings, RECOMMENDATION_CONFIG.matrix.iterations);
          
          // Get a larger number of recommendations to account for filtering
          const requestedRecommendations = RECOMMENDATION_CONFIG.recommendationsPerPage * 3; // Ask for 3x more to ensure enough after filtering
          serverLog(`Getting ${requestedRecommendations} matrix factorization recommendations (before filtering)`, 'info');
          
        result = await matrixRecommender.getRecommendations(
          userId,
            requestedRecommendations
          );
          
          serverLog(`Matrix recommender returned ${result.recommendations ? result.recommendations.length : 0} raw recommendations`, 'info');
          
          // If no recommendations, try a fallback with more latent factors
          if (!result.recommendations || result.recommendations.length === 0) {
            serverLog('Standard matrix factorization returned no recommendations, trying fallback with more factors', 'info');
            
            // Create a fallback recommender with more factors
            const fallbackRecommender = MatrixFactorizationFactory.createRecommender({
              method: 'svd',
              numFactors: RECOMMENDATION_CONFIG.matrix.numFactors * 2, // Double the factors
              learningRate: RECOMMENDATION_CONFIG.matrix.learningRate * 1.5, // Increase learning rate
              regularization: RECOMMENDATION_CONFIG.matrix.regularization / 2 // Reduce regularization
            });
            
            // Train with the same ratings
            await fallbackRecommender.train(userRatings, RECOMMENDATION_CONFIG.matrix.iterations * 1.5);
            
            // Get recommendations from fallback
            const fallbackResult = await fallbackRecommender.getRecommendations(
              userId,
              requestedRecommendations
            );
            
            if (fallbackResult.recommendations && fallbackResult.recommendations.length > 0) {
              serverLog(`Fallback matrix recommender found ${fallbackResult.recommendations.length} recommendations`, 'info');
              fallbackResult.explanation = `Using enhanced matrix factorization as fallback: ${fallbackResult.explanation}`;
              result = fallbackResult;
            } else {
              serverLog('Fallback matrix recommender also returned no recommendations', 'info');
              
              // Try PCA-based approach as a second fallback
              serverLog('Trying PCA-based matrix factorization as second fallback', 'info');
              const pcaRecommender = MatrixFactorizationFactory.createRecommender({
                method: 'svd-pca', // Switch to PCA-based approach
                numFactors: RECOMMENDATION_CONFIG.matrix.numFactors * 3, // Triple the factors for PCA
                learningRate: RECOMMENDATION_CONFIG.matrix.learningRate * 2, // Higher learning rate
                regularization: RECOMMENDATION_CONFIG.matrix.regularization / 4, // Lower regularization
                varianceThreshold: 0.8 // Lower threshold to keep more components
              });
              
              // Train the PCA recommender
              await pcaRecommender.train(userRatings, RECOMMENDATION_CONFIG.matrix.iterations * 2);
              
              // Get recommendations from PCA fallback
              const pcaResult = await pcaRecommender.getRecommendations(
                userId,
                requestedRecommendations
              );
              
              if (pcaResult.recommendations && pcaResult.recommendations.length > 0) {
                serverLog(`PCA fallback found ${pcaResult.recommendations.length} recommendations`, 'info');
                pcaResult.explanation = `Using PCA-based matrix factorization: ${pcaResult.explanation}`;
                result = pcaResult;
              } else {
                serverLog('All matrix factorization approaches failed to generate recommendations', 'warning');
              }
            }
          }
          
          // Filter out businesses that the user has already liked
          const likedBusinessIds = new Set(userRatings.map((r: any) => r.business_id));
          serverLog(`Filtering out ${likedBusinessIds.size} already liked businesses from matrix recommendations`, 'info');
          
          // Filter recommendations to exclude already liked items
          if (Array.isArray(result.recommendations)) {
            const originalCount = result.recommendations.length;
            result.recommendations = result.recommendations.filter((rec: any) => {
              // Handle string IDs or object IDs
              const recId = typeof rec === 'string' ? rec : (rec.business_id || rec.id);
              return !likedBusinessIds.has(recId);
            });
            serverLog(`Filtered out ${originalCount - result.recommendations.length} already liked items, ${result.recommendations.length} remain`, 'info');
            
            // If we've filtered out too many and have less than desired, add a note to the explanation
            if (result.recommendations.length < RECOMMENDATION_CONFIG.recommendationsPerPage / 2) {
              result.explanation = `${result.explanation || 'Matrix factorization'} (Limited results due to filtering already liked items)`;
            }
          }
        } catch (error) {
          serverLog(`Error in matrix factorization: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          console.error('Matrix factorization error:', error);
          
          // Return empty results with explanation instead of crashing
          result = {
            recommendations: [],
            explanation: `Error in matrix factorization: ${error instanceof Error ? error.message : 'Unknown error'}`,
            logs: ['Matrix factorization algorithm encountered an error']
          };
        }
        
        break;
      }
      
      case "hybrid": {
        serverLog('Using hybrid recommendation algorithm', 'info');
        
        // Generate recommendations from all three algorithms
        let contentBasedResult;
        let collaborativeResult;
        let matrixResult;
        
        // Content-based recommendations
        try {
          serverLog('Getting content-based recommendations for hybrid', 'info');
          await initializeContentRecommender();
          contentBasedResult = await contentRecommender.getRecommendations(
            userId,
            new Map(userRatings.map((r: any) => [r.business_id || r.restaurant_id, r.rating])),
            RECOMMENDATION_CONFIG.recommendationsPerPage
          );
        } catch (error) {
          serverLog(`Error getting content-based recommendations for hybrid: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          contentBasedResult = { recommendations: [], explanation: 'Failed to generate content-based recommendations', logs: [] };
        }
        
        // Collaborative filtering recommendations
        try {
          serverLog('Getting collaborative filtering recommendations for hybrid', 'info');
          
          // Load ratings from CSV to find similar users
          const filePath = path.join(process.cwd(), 'data/processed/ratings_processed.csv');
          if (fs.existsSync(filePath)) {
            // First, get all businesses rated by the target user
            const userRatedBusinessIds = new Set(userRatings.map((r: any) => r.business_id));
            
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const allRatings = parse(fileContent, { columns: true });
            
            // Find users who have rated the same businesses as our target user
            const similarUserIds = new Set<string>();
            const userBusinessRatings = new Map<string, Set<string>>();
            
            // First pass: find users who have rated the same businesses
            allRatings.forEach((rating: any) => {
              if (userRatedBusinessIds.has(rating.business_id)) {
                similarUserIds.add(rating.user_id);
                if (!userBusinessRatings.has(rating.user_id)) {
                  userBusinessRatings.set(rating.user_id, new Set());
                }
                userBusinessRatings.get(rating.user_id)!.add(rating.business_id);
              }
            });
            
            // Sort similar users by number of common ratings and take top N
            const topSimilarUsers = Array.from(similarUserIds)
              .map(userId => ({
                userId,
                commonRatings: userBusinessRatings.get(userId)!.size
              }))
              .sort((a, b) => b.commonRatings - a.commonRatings)
              .slice(0, 20)
              .map(u => u.userId);
            
            // Second pass: collect ratings from similar users
            const relevantRatings: any[] = [];
            
            // First add the target user's ratings
            userRatings.forEach((rating: any) => {
              relevantRatings.push({
                user_id: userId,
                business_id: rating.business_id,
                rating: parseFloat(rating.rating) || 3
              });
            });
            
            // Then add ratings from similar users, with a limit
            let ratingsCount = 0;
            const MAX_RATINGS = 2000;
            allRatings.forEach((rating: any) => {
              if (ratingsCount >= MAX_RATINGS) return;
              if (topSimilarUsers.includes(rating.user_id)) {
                relevantRatings.push({
                  user_id: rating.user_id,
                  business_id: rating.business_id,
                  rating: parseFloat(rating.rating) || 3
                });
                ratingsCount++;
              }
            });
            
            // Initialize collaborative recommender
            await collaborativeRecommender.initialize(relevantRatings);
            collaborativeResult = await collaborativeRecommender.getRecommendations(
              userId,
              RECOMMENDATION_CONFIG.recommendationsPerPage
            );
          } else {
            throw new Error('Ratings data not available');
          }
        } catch (error) {
          serverLog(`Error getting collaborative filtering recommendations for hybrid: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          collaborativeResult = { recommendations: [], explanation: 'Failed to generate collaborative filtering recommendations', logs: [] };
        }
        
        // Matrix factorization recommendations
        try {
          serverLog('Getting matrix factorization recommendations for hybrid', 'info');
          
          // CRITICAL FIX: The SVD model needs more item data than just the user's ratings
          const allBusinesses = loadAllBusinessesFromCsv();
          
          // Generate training data with additional ratings to expand the item universe
          const additionalRatings: Rating[] = [];
          
          // Get the businesses the user has already rated
          const userRatedBusinessIds = new Set(userRatings.map((r: any) => r.business_id));
          
          // Group all businesses by category for more diverse sampling
          const categoriesMap = new Map<string, any[]>();
          const citiesMap = new Map<string, any[]>();
          
          // Process all businesses to create category and city maps
          allBusinesses.forEach((business: any) => {
            if (userRatedBusinessIds.has(business.business_id)) return;
            
            if (business.categories && business.categories.length > 0) {
              business.categories.forEach((category: string) => {
                if (!categoriesMap.has(category)) {
                  categoriesMap.set(category, []);
                }
                categoriesMap.get(category)!.push(business);
              });
            }
            
            const city = business.location?.city || "Unknown";
            if (!citiesMap.has(city)) {
              citiesMap.set(city, []);
            }
            citiesMap.get(city)!.push(business);
          });
          
          // Get a diverse set of businesses
          const selectedBusinesses = new Set<string>();
          
          // First, select businesses from the same categories as what the user has liked
          const userLikedCategories = new Set<string>();
          userRatings.forEach((rating: any) => {
            const business = allBusinesses.find((b: any) => b.business_id === rating.business_id);
            if (business && business.categories) {
              business.categories.forEach((category: string) => userLikedCategories.add(category));
            }
          });
          
          // Add mock ratings
          const mockUsers = ['mock_user_positive', 'mock_user_neutral', 'mock_user_negative'];
          const mockUserBias = [4.5, 3, 1.5];
          
          Array.from(selectedBusinesses).forEach((businessId, index) => {
            const mockUserIndex = index % mockUsers.length;
            const mockUserId = mockUsers[mockUserIndex];
            const baseBias = mockUserBias[mockUserIndex];
            
            const rating = Math.max(1, Math.min(5, baseBias + (Math.random() - 0.5)));
            
            additionalRatings.push({
              user_id: mockUserId,
              business_id: businessId,
              rating
            });
          });
          
          // Train the model with combined ratings
          const combinedRatings = [...userRatings, ...additionalRatings];
          await matrixRecommender.train(combinedRatings, RECOMMENDATION_CONFIG.matrix.iterations);
          
          // Get recommendations
          const requestedRecommendations = RECOMMENDATION_CONFIG.recommendationsPerPage * 3;
          matrixResult = await matrixRecommender.getRecommendations(
            userId,
            requestedRecommendations
          );
        } catch (error) {
          serverLog(`Error getting matrix factorization recommendations for hybrid: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          matrixResult = { recommendations: [], explanation: 'Failed to generate matrix factorization recommendations', logs: [] };
        }
        
        // Now combine all recommendations with weights
        serverLog('Combining recommendations for hybrid model', 'info');
        
        // Default weights for combination
        const weights = {
          contentBased: 0.33,
          collaborative: 0.33,
          matrix: 0.34
        };
        
        // Map of business IDs to combined scores
        const combinedScores = new Map<string, { score: number, sources: string[] }>();
        
        // Function to normalize recommendation scores from 0-1
        const normalizeScores = (recommendations: any[]) => {
          if (!recommendations || recommendations.length === 0) return [];
          
          // Find max score for normalization
          let maxScore = 0;
          recommendations.forEach((rec: any) => {
            const score = typeof rec === 'object' ? (rec.score || 0) : 0;
            maxScore = Math.max(maxScore, score);
          });
          
          // Normalize all scores from 0-1
          return recommendations.map((rec: any) => {
            if (typeof rec === 'string') {
              return { business_id: rec, score: 1 };
            } else if (typeof rec === 'object') {
              const business_id = rec.business_id || rec.id;
              const normalizedScore = maxScore > 0 ? (rec.score || 0) / maxScore : 1;
              return { business_id, score: normalizedScore };
            }
            return null;
          }).filter(Boolean);
        };
        
        // Add content-based recommendations to combined scores
        const normalizedContentBased = normalizeScores(contentBasedResult.recommendations);
        normalizedContentBased.forEach((rec: any) => {
          if (!rec.business_id) return;
          
          if (!combinedScores.has(rec.business_id)) {
            combinedScores.set(rec.business_id, { score: 0, sources: [] });
          }
          
          const entry = combinedScores.get(rec.business_id)!;
          entry.score += rec.score * weights.contentBased;
          entry.sources.push('content');
        });
        
        // Add collaborative filtering recommendations to combined scores
        const normalizedCollaborative = normalizeScores(collaborativeResult.recommendations);
        normalizedCollaborative.forEach((rec: any) => {
          if (!rec.business_id) return;
          
          if (!combinedScores.has(rec.business_id)) {
            combinedScores.set(rec.business_id, { score: 0, sources: [] });
          }
          
          const entry = combinedScores.get(rec.business_id)!;
          entry.score += rec.score * weights.collaborative;
          entry.sources.push('collaborative');
        });
        
        // Add matrix factorization recommendations to combined scores
        const normalizedMatrix = normalizeScores(matrixResult.recommendations);
        normalizedMatrix.forEach((rec: any) => {
          if (!rec.business_id) return;
          
          if (!combinedScores.has(rec.business_id)) {
            combinedScores.set(rec.business_id, { score: 0, sources: [] });
          }
          
          const entry = combinedScores.get(rec.business_id)!;
          entry.score += rec.score * weights.matrix;
          entry.sources.push('matrix');
        });
        
        // Convert the combined scores map to an array of recommendations
        const combinedRecommendations = Array.from(combinedScores.entries())
          .map(([business_id, { score, sources }]) => ({
            business_id,
            id: business_id, // For client compatibility
            score,
            sources // Track which algorithms contributed to this recommendation
          }))
          .sort((a, b) => b.score - a.score) // Sort by score
          .slice(0, RECOMMENDATION_CONFIG.recommendationsPerPage); // Limit to desired number
        
        // Filter out businesses that the user has already liked
        const likedBusinessIds = new Set(userRatings.map((r: any) => r.business_id));
        serverLog(`Filtering out ${likedBusinessIds.size} already liked businesses from hybrid recommendations`, 'info');
        
        // Filter recommendations
        const originalCount = combinedRecommendations.length;
        const filteredRecommendations = combinedRecommendations.filter((rec: any) => {
          return !likedBusinessIds.has(rec.business_id);
        });
        
        serverLog(`Filtered out ${originalCount - filteredRecommendations.length} already liked items from hybrid recommendations`, 'info');
        
        // Construct the final result
        result = {
          recommendations: filteredRecommendations,
          explanation: `Hybrid recommendations using a weighted combination of content-based (${weights.contentBased * 100}%), collaborative filtering (${weights.collaborative * 100}%), and matrix factorization (${weights.matrix * 100}%)`,
          logs: [
            `Combined ${normalizedContentBased.length} content-based, ${normalizedCollaborative.length} collaborative, and ${normalizedMatrix.length} matrix factorization recommendations`,
            `Generated ${filteredRecommendations.length} hybrid recommendations after filtering`
          ]
        };
        
        break;
      }
      
      case "kmeans": {
        serverLog('Using k-means clustering algorithm', 'info');
        serverLog('K-means clustering algorithm is not yet implemented', 'warn');
        
        // For now, return a message that k-means is not yet implemented
        // In a real implementation, we would:
        // 1. Load user and business data
        // 2. Extract features for clustering
        // 3. Run k-means clustering
        // 4. Find the user's cluster
        // 5. Recommend items from the same cluster that the user hasn't rated
        
        result = {
          recommendations: [],
          explanation: "K-means clustering recommendations are coming soon. For now, try another algorithm.",
          logs: ["K-means clustering algorithm is not yet implemented"]
        };
        
        break;
      }
      
      default:
        serverLog(`Unknown algorithm: ${algorithm}`, 'error');
        throw new Error(`Unknown algorithm: ${algorithm}`);
    }

    serverLog(`Found ${result.recommendations.length} recommendations using ${algorithm}`, 'info');
    
    // Log recommendation IDs
    if (result.recommendations.length > 0) {
      const recIds = result.recommendations.map((r: any) => {
        // Handle both string IDs and object IDs
        if (typeof r === 'string') {
          return r;
        } else {
          return r.business_id || r.id || 'unknown';
        }
      }).join(', ');
      serverLog(`Recommendation IDs: ${recIds}`, 'debug');
    }
    
    // Transform recommendations to ensure they have both id and business_id fields
    const mappedRecommendations = result.recommendations.map((rec: any) => {
      if (typeof rec === 'string') {
        // If it's just a string ID, create a proper object
        return {
          id: rec,  // For client compatibility 
          business_id: rec  // Keep original ID
        };
      } else if (rec && typeof rec === 'object') {
        // If it's an object, ensure it has both ID fields
        return {
          ...rec,
          id: rec.id || rec.business_id,  // Ensure id exists for client
          business_id: rec.business_id || rec.id  // Ensure business_id exists
        };
      } else {
        // Handle unexpected format
        serverLog(`Warning: Recommendation has unexpected format: ${JSON.stringify(rec)}`, 'warning');
        return { id: 'unknown', business_id: 'unknown' };
      }
    });
    
    serverLog(`Mapped ${mappedRecommendations.length} recommendations with proper ID fields`, 'info');

    // Load all businesses from CSV without filtering for restaurants
    const allBusinesses = loadAllBusinessesFromCsv();
    serverLog(`Loaded ${allBusinesses.length} businesses for hydration`, 'info');
    
    // Create a map of business_id to business object for quick lookups
    const businessMap = new Map();
    allBusinesses.forEach((business: any) => {
      businessMap.set(business.business_id, business);
    });
    
    // Hydrate the recommendations with full business data
    const hydratedRecommendations = mappedRecommendations.map(rec => {
      const businessId = rec.business_id || rec.id;
      const fullBusiness = businessMap.get(businessId);
      
      if (fullBusiness) {
        serverLog(`Found full details for recommendation: ${businessId}`, 'debug');
        return {
          ...fullBusiness,
          business_id: businessId // Ensure the business_id is preserved
        };
      } else {
        serverLog(`Warning: No business data found for recommendation ID: ${businessId}`, 'warn');
        return rec; // Return the original recommendation if no matching business found
      }
    });
    
    serverLog(`Hydrated ${hydratedRecommendations.length} recommendations with full business data`, 'info');

    // Prepare response data
    const responseData = {
      success: true,
      recommendations: hydratedRecommendations,
      explanation: result.explanation,
      logs: result.logs
    };
    
    // Cache the recommendations
    cacheRecommendations(userId, algorithm, responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    serverLog(`Error processing recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    console.error('Error processing recommendations:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 