const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Cache for parsed CSV data
const cache = {
  users: null,
  ratings: null,
  userRatings: new Map()
};

// Load 10 random users from user_processed.csv
function loadRandomUsers(count = 10) {
  try {
    console.log('Loading random users...');
    
    // Use cached users if available
    if (cache.users) {
      console.log(`Using ${cache.users.length} cached users`);
      // Just shuffle and return the requested count
      const shuffled = [...cache.users].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    }
    
    // Load user data
    const userFilePath = path.join(process.cwd(), 'data', 'processed', 'user_processed.csv');
    if (!fs.existsSync(userFilePath)) {
      console.error('User CSV file not found at path:', userFilePath);
      return [];
    }
    
    const userFileContent = fs.readFileSync(userFilePath, 'utf8');
    console.log('User file loaded, first 100 chars:', userFileContent.substring(0, 100));
    
    // Parse user CSV content
    const users = parse(userFileContent, { 
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Parsed ${users.length} users from CSV`);
    
    // Load and cache ratings to count per user
    loadAllRatings();
    
    // Count ratings per user
    const userRatingCounts = {};
    if (cache.ratings) {
      cache.ratings.forEach(rating => {
        if (rating.user_id) {
          userRatingCounts[rating.user_id] = (userRatingCounts[rating.user_id] || 0) + 1;
        }
      });
    }
    
    console.log(`Counted ratings for ${Object.keys(userRatingCounts).length} users`);
    
    // Enhance user objects with rating counts
    const enhancedUsers = users.map(user => {
      const ratingCount = userRatingCounts[user.user_id] || 0;
      return {
        ...user,
        name: `${user.name || user.user_id.substring(0, 8)} - ${ratingCount} ratings`,
        rating_count: ratingCount
      };
    });
    
    // Cache the enhanced users
    cache.users = enhancedUsers;
    
    // Find Lannan's user profile
    const TARGET_USERS = [
      { id: 'NhyPi4DqyrJ9bVGRfdYtEQ', name: 'Lannan'},
      { id: 'Daz7vORlh6_GtwVmHJzcUA', name: 'Scott' },
      { id: '-6JRuWL1VIVsDtLztmFwjA', name: 'ThePartyPooper'}
    ];
    
    // Array to store the target users we find or create
    const targetUsers = [];
    
    // Process each target user
    for (const targetUserData of TARGET_USERS) {
      const targetUserId = targetUserData.id;
      
      // Find the user in the dataset
      const userIndex = enhancedUsers.findIndex(user => user.user_id === targetUserId);
      
      // If found in the dataset, remove from array to avoid duplication
      if (userIndex !== -1) {
        const foundUser = enhancedUsers.splice(userIndex, 1)[0];
        console.log(`Found target user ${targetUserData.name} (${targetUserId}) in dataset`);
        targetUsers.push(foundUser);
      } else {
        // If not found, create a placeholder
        console.log(`Target user ${targetUserData.name} (${targetUserId}) not found in dataset, creating placeholder`);
        const ratingCount = userRatingCounts[targetUserId] || 0;
        targetUsers.push({
          user_id: targetUserId,
          name: `${targetUserData.name} - ${ratingCount} ratings`,
          review_count: targetUserData.review_count || '0',
          average_stars: targetUserData.average_stars || '0',
          rating_count: ratingCount
        });
      }
    }
    
    // Shuffle the rest of the users
    const shuffled = [...enhancedUsers].sort(() => 0.5 - Math.random());
    
    // Take count minus the number of target users
    const randomUsers = shuffled.slice(0, count - TARGET_USERS.length);
    
    // Add target users at the beginning of the array
    return [...targetUsers, ...randomUsers];
  } catch (error) {
    console.error('Error loading random users:', error);
    return [];
  }
}

// Load all ratings data (called internally)
function loadAllRatings() {
  if (cache.ratings) {
    console.log(`Using ${cache.ratings.length} cached ratings`);
    return cache.ratings;
  }
  
  try {
    console.log('Loading all ratings data...');
    const filePath = path.join(process.cwd(), 'data', 'processed', 'ratings_processed.csv');
    
    if (!fs.existsSync(filePath)) {
      console.error('Ratings CSV file not found at path:', filePath);
      return [];
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    console.log('Ratings file loaded');
    
    // Parse CSV content
    const ratings = parse(fileContent, { 
      columns: true,
      skip_empty_lines: true
    });
    
    // Cache the results
    cache.ratings = ratings;
    
    console.log(`Parsed and cached ${ratings.length} ratings from CSV`);
    return ratings;
  } catch (error) {
    console.error('Error loading ratings:', error);
    return [];
  }
}

// Get all ratings for a specific user
function getUserRatings(userId) {
  try {
    console.log('Getting ratings for user:', userId);
    
    // Check cache first
    if (cache.userRatings.has(userId)) {
      const cachedRatings = cache.userRatings.get(userId);
      console.log(`Using ${cachedRatings.length} cached ratings for user ${userId}`);
      return cachedRatings;
    }
    
    // Make sure all ratings are loaded
    const allRatings = loadAllRatings();
    
    // Filter ratings for the specific user
    const userRatings = allRatings.filter(rating => rating.user_id === userId);
    console.log(`Found ${userRatings.length} ratings for user ${userId}`);
    
    // Cache for future use
    cache.userRatings.set(userId, userRatings);
    
    return userRatings;
  } catch (error) {
    console.error('Error loading user ratings:', error);
    return [];
  }
}

// Convert ratings to business IDs list with rating data
function getUserLikedBusinessIds(userId) {
  console.log('Getting liked business IDs for user:', userId);
  const ratings = getUserRatings(userId);
  
  if (ratings.length > 0) {
    console.log('First rating:', JSON.stringify(ratings[0]));
  }
  
  // Instead of just business IDs, return business IDs with their ratings
  const businessRatings = ratings.map(rating => ({
    business_id: rating.business_id,
    user_rating: parseFloat(rating.rating) || 0
  }));
  
  console.log(`Returning ${businessRatings.length} business ratings`);
  
  return businessRatings;
}

module.exports = {
  loadRandomUsers,
  getUserRatings,
  getUserLikedBusinessIds
}; 