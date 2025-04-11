// Server-side content-based recommendation system 
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { parse } = require('csv-parse/sync');
const { computeEmbeddings, batchSentimentAnalysis } = require('./textProcessing');
const { serverLog, logSessionStart } = require('./logger');

// Cache paths
const DATA_DIR = path.join(process.cwd(), 'data');
const PROCESSED_DATA_DIR = path.join(DATA_DIR, 'processed');
const CACHE_DIR = path.join(process.cwd(), 'cache');
const ITEM_PROFILES_CACHE = path.join(CACHE_DIR, 'item_profiles_cache.json');
const AGGREGATED_REVIEWS_CACHE = path.join(CACHE_DIR, 'aggregated_reviews_cache.json');
const BUSINESS_SENTIMENTS_CACHE = path.join(CACHE_DIR, 'business_sentiments_cache.json');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Helper to create sequential logs with timestamps
function createLogger() {
  const logs = [];
  
  return {
    log: function(message) {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false
      });
      logs.push(`${formattedTime} - ${message}`);
      // Also log to the server log file
      serverLog(message);
      return logs;
    },
    getLogs: function() {
      return logs;
    }
  };
}

/**
 * Cache results to a JSON file
 * @param {string} cachePath - Path to cache file
 * @param {Function} computeFunction - Function to compute the result if cache miss
 * @param {boolean} forceRecompute - Whether to force recomputation
 * @returns {any} - Cached or computed result
 */
function cacheResults(cachePath, computeFunction, forceRecompute = false) {
  try {
    // If cache exists and we're not forcing recomputation, return cached result
    if (fs.existsSync(cachePath) && !forceRecompute) {
      serverLog(`Loading cached results from ${cachePath}`, 'debug');
      console.log(`Loading cached results from ${cachePath}`);
      const cachedData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      return cachedData;
    }
    
    // Otherwise, compute the result
    serverLog(`Computing results for ${cachePath}`, 'debug');
    console.log(`Computing results for ${cachePath}`);
    const result = computeFunction();
    
    // Save to cache
    fs.writeFileSync(cachePath, JSON.stringify(result));
    return result;
  } catch (error) {
    serverLog(`Error in cacheResults for ${cachePath}: ${error.message}`, 'error');
    console.error(`Error in cacheResults for ${cachePath}:`, error);
    // If cache fails, still try to compute the result
    return computeFunction();
  }
}

/**
 * Aggregate review texts per business
 * @param {Array} reviewsData - Array of review objects
 * @returns {Object} - Mapping of business_id to aggregated review text
 */
function aggregateBusinessReviews(reviewsData) {
  serverLog(`Aggregating reviews for ${reviewsData.length} reviews`, 'info');
  return cacheResults(
    AGGREGATED_REVIEWS_CACHE,
    () => {
      console.log(`Aggregating reviews for ${reviewsData.length} reviews`);
      const businessReviews = {};
      
      // Group reviews by business_id
      reviewsData.forEach(review => {
        const businessId = review.business_id;
        // Updated to prioritize review_text column name from our dataset
        const reviewText = review.review_text || review.text || '';
        
        if (!businessReviews[businessId]) {
          businessReviews[businessId] = [];
        }
        
        businessReviews[businessId].push(reviewText);
      });
      
      // Join review texts for each business
      const aggregatedReviews = {};
      Object.entries(businessReviews).forEach(([businessId, reviews]) => {
        aggregatedReviews[businessId] = reviews.join(' ');
      });
      
      serverLog(`Aggregated reviews for ${Object.keys(aggregatedReviews).length} businesses`, 'info');
      return aggregatedReviews;
    }
  );
}

/**
 * Calculate sentiment scores for each business
 * @param {Array} reviewsData - Array of review objects
 * @returns {Object} - Mapping of business_id to average sentiment
 */
function calculateBusinessSentiments(reviewsData) {
  serverLog(`Calculating sentiment for ${reviewsData.length} reviews`, 'info');
  return cacheResults(
    BUSINESS_SENTIMENTS_CACHE,
    () => {
      console.log(`Calculating sentiment for ${reviewsData.length} reviews`);
      
      // Get review texts
      const reviewTexts = reviewsData.map(review => 
        review.text || review.review_text || '');
      
      // Batch sentiment analysis
      const sentiments = batchSentimentAnalysis(reviewTexts);
      
      // Create temporary array for group-by operation
      const businessSentiments = [];
      reviewsData.forEach((review, i) => {
        businessSentiments.push({
          business_id: review.business_id,
          sentiment: sentiments[i].comparative
        });
      });
      
      // Group by business_id and calculate average sentiment
      const averageSentiments = {};
      const businessScores = {};
      const businessCounts = {};
      
      businessSentiments.forEach(item => {
        const { business_id, sentiment } = item;
        
        if (!businessScores[business_id]) {
          businessScores[business_id] = 0;
          businessCounts[business_id] = 0;
        }
        
        businessScores[business_id] += sentiment;
        businessCounts[business_id] += 1;
      });
      
      // Calculate average
      Object.keys(businessScores).forEach(business_id => {
        averageSentiments[business_id] = 
          businessScores[business_id] / businessCounts[business_id];
      });
      
      serverLog(`Calculated sentiment scores for ${Object.keys(averageSentiments).length} businesses`, 'info');
      return averageSentiments;
    }
  );
}

/**
 * Build content-based item profiles
 * @param {Array} businessData - Array of business objects
 * @param {Array} reviewsData - Array of review objects
 * @returns {Object} - Mapping of business_id to feature vector
 */
function buildItemProfiles(businessData, reviewsData) {
  serverLog(`Building item profiles for ${businessData.length} businesses`, 'info');
  return cacheResults(
    ITEM_PROFILES_CACHE,
    () => {
      console.log(`Building item profiles for ${businessData.length} businesses`);
      
      // Aggregate review texts per business
      const aggregatedReviews = aggregateBusinessReviews(reviewsData);
      
      // Create array of businesses with their aggregated reviews
      const businessWithReviews = businessData.map(business => {
        const businessId = business.id || business.business_id;
        return {
          ...business,
          review_text: aggregatedReviews[businessId] || ''
        };
      });
      
      // Extract review texts for embedding
      const reviewTexts = businessWithReviews.map(business => business.review_text);
      
      // Compute embeddings
      serverLog("Computing text embeddings for business reviews", 'info');
      const embeddings = computeEmbeddings(reviewTexts);
      serverLog(`Generated ${embeddings.length} embeddings`, 'info');
      
      // Calculate sentiment scores
      const businessSentiments = calculateBusinessSentiments(reviewsData);
      
      // Build item profiles by combining embeddings and sentiment
      const itemProfiles = {};
      
      businessWithReviews.forEach((business, i) => {
        const businessId = business.id || business.business_id;
        const embedding = embeddings[i] || new Array(50).fill(0);
        const avgSentiment = businessSentiments[businessId] || 0;
        
        // Append average sentiment to the embedding vector
        itemProfiles[businessId] = [...embedding, avgSentiment];
      });
      
      serverLog(`Built item profiles for ${Object.keys(itemProfiles).length} businesses`, 'info');
      return itemProfiles;
    }
  );
}

/**
 * Recommend similar businesses based on cosine similarity
 * @param {string} businessId - Target business ID
 * @param {Object} itemProfiles - Mapping of business_id to feature vector
 * @param {number} topN - Number of recommendations to return
 * @returns {Array<string>} - Array of recommended business IDs
 */
function recommendSimilarBusinesses(businessId, itemProfiles, topN = 5) {
  serverLog(`Finding similar businesses to ${businessId}`, 'info');
  console.log(`Finding similar businesses to ${businessId}`);
  
  const businessIds = Object.keys(itemProfiles);
  
  if (!businessIds.includes(businessId)) {
    serverLog(`Business ID ${businessId} not found in profiles`, 'error');
    console.error(`Business ID ${businessId} not found in profiles`);
    return [];
  }
  
  // Get the feature vector for the target business
  const targetVector = itemProfiles[businessId];
  
  // Calculate similarity with all other businesses
  const similarities = [];
  
  businessIds.forEach(id => {
    if (id === businessId) return;
    
    const vector = itemProfiles[id];
    const similarity = calculateCosineSimilarity(targetVector, vector);
    
    similarities.push({ id, similarity });
  });
  
  // Sort by similarity and return top N
  const recommendations = similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN)
    .map(item => item.id);
  
  serverLog(`Found ${recommendations.length} similar businesses for ${businessId}`, 'info');
  return recommendations;
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vecA - First vector
 * @param {Array<number>} vecB - Second vector
 * @returns {number} - Cosine similarity
 */
function calculateCosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  // Prevent division by zero
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Parse categories from various formats
 * @param {any} categoriesData - Categories data in various formats
 * @returns {string[]} - Array of category strings
 */
function parseCategories(categoriesData) {
  // If it's already an array, return it
  if (Array.isArray(categoriesData)) {
    return categoriesData;
  }
  
  // If it's a string, try to parse it
  if (typeof categoriesData === 'string') {
    // If it looks like a Python list string: "['Hotels & Travel', 'Airports']"
    if (categoriesData.startsWith('[') && categoriesData.endsWith(']')) {
      try {
        // Replace single quotes with double quotes and parse
        const jsonString = categoriesData.replace(/'/g, '"');
        return JSON.parse(jsonString);
      } catch (e) {
        // If JSON parsing fails, try a simpler approach - split by comma
        const stripped = categoriesData.replace(/[\[\]']/g, '');
        return stripped.split(',').map(s => s.trim());
      }
    }
    
    // If it's just a comma-separated string: "Hotels & Travel, Airports"
    if (categoriesData.includes(',')) {
      return categoriesData.split(',').map(s => s.trim());
    }
    
    // If it's just a single category
    return [categoriesData];
  }
  
  // Default to empty array
  return [];
}

/**
 * Get content-based recommendations for a set of business IDs
 * @param {Array<string>} businessIds - Array of business IDs
 * @returns {Object} - Recommendations and logs
 */
function getContentBasedRecommendations(businessIds) {
  // Start a new recommendation session in the log
  logSessionStart();
  serverLog(`Starting content-based recommendation process for ${businessIds.length} business IDs: ${JSON.stringify(businessIds)}`, 'info');
  
  // Create a logger to track the process
  const logger = createLogger();
  logger.log(`Starting content-based recommendation process for ${businessIds.length} items`);
  
  try {
    logger.log("Loading business data...");
    
    // Read business data with proper CSV parsing
    const businessFile = path.join(PROCESSED_DATA_DIR, 'business_processed.csv');
    
    logger.log(`Reading business data from ${businessFile}`);
    serverLog(`Reading business data from CSV: ${businessFile}`, 'info');
    
    // Use csv-parse/sync for safer parsing of complex CSV
    const businessContent = fs.readFileSync(businessFile, 'utf8');
    const rawBusinessData = parse(businessContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    serverLog(`Loaded ${rawBusinessData.length} raw business records from CSV`, 'debug');
    
    // Process categories properly for each business
    const businessData = rawBusinessData.map(business => {
      // Process categories using our helper function
      const categories = parseCategories(business.categories_list || business.categories);
      
      // Log sample of business data with categories
      if (business.business_id === businessIds[0]) {
        serverLog(`Sample business data: ${JSON.stringify({
          id: business.business_id,
          name: business.name,
          city: business.city,
          state: business.state,
          categories: categories
        })}`, 'debug');
      }
      
      return {
        ...business,
        categories: categories
      };
    });
    
    logger.log(`Loaded ${businessData.length} businesses`);
    serverLog(`Processed ${businessData.length} businesses with categories`, 'info');
    
    // Read review data with proper CSV parsing
    logger.log("Loading review data...");
    const reviewFile = path.join(PROCESSED_DATA_DIR, 'reviews_processed.csv');
    
    logger.log(`Reading review data from ${reviewFile}`);
    serverLog(`Reading review data from CSV: ${reviewFile}`, 'info');
    
    // Use csv-parse/sync for safer parsing of review CSV
    const reviewContent = fs.readFileSync(reviewFile, 'utf8');
    const reviewsData = parse(reviewContent, {
      columns: true,
      skip_empty_lines: true,
      // Handle special characters and line breaks in review text
      relax_column_count: true
    });
    
    logger.log(`Loaded ${reviewsData.length} reviews`);
    serverLog(`Loaded ${reviewsData.length} reviews from CSV`, 'info');
    
    // Read user ratings for enhanced recommendation context
    const ratingsFile = path.join(PROCESSED_DATA_DIR, 'ratings_processed.csv');
    let ratingsData = [];
    
    if (fs.existsSync(ratingsFile)) {
      serverLog(`Reading ratings data from CSV: ${ratingsFile}`, 'info');
      const ratingsContent = fs.readFileSync(ratingsFile, 'utf8');
      ratingsData = parse(ratingsContent, {
        columns: true,
        skip_empty_lines: true
      });
      serverLog(`Loaded ${ratingsData.length} ratings from CSV`, 'info');
      
      // Look for ratings specific to our business IDs
      const relevantRatings = ratingsData.filter(rating => 
        businessIds.includes(rating.business_id)
      );
      
      if (relevantRatings.length > 0) {
        serverLog(`Found ${relevantRatings.length} ratings for the input business IDs: ${JSON.stringify(relevantRatings)}`, 'info');
      } else {
        serverLog(`No ratings found for the input business IDs in the ratings data`, 'warn');
      }
    }
    
    // Build item profiles
    logger.log("Building item profiles from reviews and business data...");
    const itemProfiles = buildItemProfiles(businessData, reviewsData);
    logger.log(`Created item profiles for ${Object.keys(itemProfiles).length} businesses`);
    
    // Debug 
    logger.log(`Provided business IDs: ${businessIds.slice(0, 3)}... (${businessIds.length} total)`);
    
    // Get recommendations for each business ID
    logger.log("Finding recommendations for each business...");
    const allRecommendations = new Map();
    
    // Check if businessIds array is valid
    if (!Array.isArray(businessIds) || businessIds.length === 0) {
      serverLog("No valid business IDs provided", 'error');
      logger.log("ERROR: No valid business IDs provided");
      return {
        recommendations: [],
        logs: logger.getLogs()
      };
    }
    
    // Track which business IDs are valid
    const validBusinessIds = [];
    const invalidBusinessIds = [];
    
    businessIds.forEach(businessId => {
      if (!businessId || typeof businessId !== 'string') {
        serverLog(`Invalid business ID format: ${businessId}`, 'warn');
        invalidBusinessIds.push(businessId);
        return;
      }
      
      logger.log(`Finding similar businesses to ${businessId}`);
      
      // Check if this business exists in our profiles
      if (!itemProfiles[businessId]) {
        serverLog(`Business ID ${businessId} not found in item profiles`, 'warn');
        logger.log(`WARNING: Business ID ${businessId} not found in profiles`);
        invalidBusinessIds.push(businessId);
        return;
      }
      
      validBusinessIds.push(businessId);
      const similarBusinesses = recommendSimilarBusinesses(businessId, itemProfiles, 5);
      
      // Add each similar business to the map with a score
      similarBusinesses.forEach((id, index) => {
        const score = allRecommendations.get(id) || 0;
        // Add a weighted score based on position (0-4) where 0 is best
        allRecommendations.set(id, score + (5 - index));
      });
    });
    
    serverLog(`Found ${validBusinessIds.length} valid business IDs and ${invalidBusinessIds.length} invalid IDs`, 'info');
    logger.log(`Found ${validBusinessIds.length} valid business IDs and ${invalidBusinessIds.length} invalid IDs`);
    logger.log(`Found ${allRecommendations.size} potential recommendations`);
    
    // Sort recommendations by score
    const sortedRecommendations = Array.from(allRecommendations.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
    
    serverLog(`Sorted recommendations by score: ${sortedRecommendations.slice(0, 5)}...`, 'debug');
    
    // Filter out any IDs that were in the input set
    const filteredRecommendations = sortedRecommendations
      .filter(id => !businessIds.includes(id));
    
    logger.log(`Filtered down to ${filteredRecommendations.length} recommendations`);
    
    // Return top 10 recommendations
    const finalRecommendations = filteredRecommendations.slice(0, 10);
    logger.log(`Returning ${finalRecommendations.length} final recommendations`);
    
    // Get business details for the final recommendations
    const recommendationDetails = finalRecommendations.map(id => {
      const business = businessData.find(b => b.business_id === id);
      if (!business) {
        serverLog(`Warning: Could not find details for business ID ${id}`, 'warn');
        return { id, business_id: id, name: 'Unknown Business' };
      }
      return {
        id: business.business_id,
        business_id: business.business_id,
        name: business.name,
        categories: business.categories,
        city: business.city,
        state: business.state
      };
    });
    
    // Ensure we have valid JSON for logging
    const safeRecommendationDetails = recommendationDetails.map(rec => ({
      id: rec.id || rec.business_id || 'unknown',
      name: rec.name || 'Unknown'
    }));
    
    serverLog(`Final recommendations: ${JSON.stringify(safeRecommendationDetails)}`, 'info');
    
    // Fallback: If no recommendations were found, provide category-based alternatives
    if (finalRecommendations.length === 0) {
      serverLog("No recommendations found, using category-based fallback strategy", 'warn');
      logger.log("No recommendations found. Using category-based fallback strategy.");
      
      // Extract categories from the input businesses
      const categorySet = new Set();
      const businessCategories = [];
      
      // For each input business ID, collect its categories
      for (const businessId of validBusinessIds) {
        // Find the business data
        const business = businessData.find(b => b.business_id === businessId);
        if (business && business.categories) {
          const categories = business.categories; // Already processed above
          
          if (categories && categories.length) {
            businessCategories.push({ businessId, categories });
            categories.forEach(cat => categorySet.add(cat));
          }
        }
      }
      
      serverLog(`Found ${categorySet.size} unique categories from input businesses: ${Array.from(categorySet).join(', ')}`, 'info');
      logger.log(`Found ${categorySet.size} unique categories from input businesses: ${Array.from(categorySet).join(', ')}`);
      
      // Find businesses with similar categories
      const categorySimilarityScores = new Map();
      
      businessData.forEach(business => {
        // Skip businesses that are in the input set
        if (businessIds.includes(business.business_id)) return;
        
        const businessCats = business.categories || [];
        
        // Calculate category overlap score
        let score = 0;
        if (businessCats.length) {
          businessCats.forEach(cat => {
            if (categorySet.has(cat)) {
              score += 1;
            }
          });
        }
        
        if (score > 0) {
          categorySimilarityScores.set(business.business_id, score);
        }
      });
      
      // Sort by category overlap score
      const fallbackRecommendations = Array.from(categorySimilarityScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);
      
      // Get business details for the fallback recommendations
      const fallbackDetails = fallbackRecommendations.map(id => {
        const business = businessData.find(b => b.business_id === id);
        if (!business) {
          serverLog(`Warning: Could not find details for fallback business ID ${id}`, 'warn');
          return { id, business_id: id, name: 'Unknown Business' };
        }
        return {
          id: business.business_id,
          business_id: business.business_id,
          name: business.name,
          categories: business.categories,
          city: business.city,
          state: business.state
        };
      });
      
      // Ensure we have valid JSON for logging
      const safeFallbackDetails = fallbackDetails.map(rec => ({
        id: rec.id || rec.business_id || 'unknown',
        name: rec.name || 'Unknown'
      }));
      
      serverLog(`Found ${fallbackRecommendations.length} fallback recommendations: ${JSON.stringify(safeFallbackDetails)}`, 'info');
      logger.log(`Found ${fallbackRecommendations.length} fallback recommendations based on category overlap`);
      
      return {
        recommendations: fallbackRecommendations,
        logs: logger.getLogs(),
        is_fallback: true
      };
    }
    
    // Return both recommendations and logs
    serverLog("Content-based recommendation process completed successfully", 'info');
    return {
      recommendations: finalRecommendations,
      logs: logger.getLogs()
    };
  } catch (error) {
    serverLog(`ERROR in getContentBasedRecommendations: ${error.message}`, 'error');
    logger.log(`ERROR: ${error.message}`);
    console.error('Error in getContentBasedRecommendations:', error);
    
    return {
      recommendations: [],
      logs: logger.getLogs()
    };
  }
}

module.exports = {
  getContentBasedRecommendations,
  aggregateBusinessReviews,
  calculateBusinessSentiments,
  buildItemProfiles,
  calculateCosineSimilarity,
  parseCategories
}; 