// A simple implementation of recommendation algorithms
// This is a simplified version for demonstration

/**
 * Get content-based recommendations based on attributes of restaurants
 * that the user has liked.
 * 
 * @param {Array} userRestaurants - Restaurants that user has interacted with
 * @param {Array} allRestaurants - All available restaurants
 * @returns {Array} - List of recommended restaurants
 */
export function getContentBasedRecommendations(userRestaurants, allRestaurants) {
  // Preserve user ratings for any user restaurants
  const userRatingsMap = new Map();
  userRestaurants.forEach(restaurant => {
    if (restaurant.user_rating !== undefined) {
      userRatingsMap.set(restaurant.id, restaurant.user_rating);
    }
  });

  // Get the categories of restaurants the user likes
  const userCategories = new Set();
  userRestaurants.forEach(restaurant => {
    if (restaurant.categories) {
      const cats = Array.isArray(restaurant.categories) 
        ? restaurant.categories 
        : restaurant.categories.split(', ');
      
      cats.forEach(category => {
        userCategories.add(category.trim().toLowerCase());
      });
    }
  });

  // Find other restaurants with similar categories
  const recommendations = allRestaurants
    .filter(restaurant => {
      // Don't recommend restaurants the user already has in their list
      const alreadyInList = userRestaurants.some(userRest => userRest.id === restaurant.id);
      if (alreadyInList) return false;

      // Check if the restaurant has categories that match the user's preferences
      if (!restaurant.categories) return false;

      const restaurantCategories = Array.isArray(restaurant.categories)
        ? restaurant.categories.map(cat => cat.trim().toLowerCase())
        : restaurant.categories.split(', ').map(cat => cat.trim().toLowerCase());
        
      const matchingCategories = restaurantCategories.filter(category => userCategories.has(category));
      
      return matchingCategories.length > 0;
    })
    .sort((a, b) => {
      // Sort by rating if available, otherwise by name
      if (a.stars && b.stars) return b.stars - a.stars;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 10) // Get top 10 recommendations
    .map(restaurant => {
      // Add user rating if available
      if (userRatingsMap.has(restaurant.id)) {
        return {
          ...restaurant,
          user_rating: userRatingsMap.get(restaurant.id)
        };
      }
      return restaurant;
    });

  return recommendations;
}

/**
 * Get collaborative filtering recommendations based on what similar
 * users have liked.
 * 
 * @param {Array} userRestaurants - Restaurants that user has interacted with
 * @param {Array} allRestaurants - All available restaurants
 * @returns {Array} - List of recommended restaurants
 */
export function getCollaborativeFilteringRecommendations(userRestaurants, allRestaurants) {
  // Preserve user ratings for any user restaurants
  const userRatingsMap = new Map();
  userRestaurants.forEach(restaurant => {
    if (restaurant.user_rating !== undefined) {
      userRatingsMap.set(restaurant.id, restaurant.user_rating);
    }
  });
  
  // Find restaurants with similar attributes to what the user likes
  const userCuisinePreferences = getCuisinePreferences(userRestaurants);
  const userPricePreferences = getPricePreferences(userRestaurants);
  
  // Find other restaurants with similar attributes
  const recommendations = allRestaurants
    .filter(restaurant => {
      // Don't recommend restaurants the user already has in their list
      const alreadyInList = userRestaurants.some(userRest => userRest.id === restaurant.id);
      if (alreadyInList) return false;

      // Check if the restaurant matches the user's cuisine preferences
      let cuisineMatch = false;
      if (restaurant.categories) {
        const cats = Array.isArray(restaurant.categories)
          ? restaurant.categories.map(cat => cat.trim().toLowerCase())
          : restaurant.categories.split(', ').map(cat => cat.trim().toLowerCase());
        cuisineMatch = cats.some(category => userCuisinePreferences.has(category));
      }
      
      // Check if the restaurant matches the user's price preferences
      let priceMatch = false;
      if (restaurant.attributes && restaurant.attributes.RestaurantsPriceRange2) {
        priceMatch = userPricePreferences.has(restaurant.attributes.RestaurantsPriceRange2);
      }
      
      // Return true if either cuisine or price matches
      return cuisineMatch || priceMatch;
    })
    .sort((a, b) => {
      // Sort by rating if available, otherwise by name
      if (a.stars && b.stars) return b.stars - a.stars;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 10) // Get top 10 recommendations
    .map(restaurant => {
      // Add user rating if available
      if (userRatingsMap.has(restaurant.id)) {
        return {
          ...restaurant,
          user_rating: userRatingsMap.get(restaurant.id)
        };
      }
      return restaurant;
    });

  return recommendations;
}

/**
 * Get matrix factorization recommendations.
 * 
 * @param {Array} userRestaurants - Restaurants that user has interacted with
 * @param {Array} allRestaurants - All available restaurants
 * @returns {Array} - List of recommended restaurants
 */
export function getMatrixFactorizationRecommendations(userRestaurants, allRestaurants) {
  // Preserve user ratings for any user restaurants
  const userRatingsMap = new Map();
  userRestaurants.forEach(restaurant => {
    if (restaurant.user_rating !== undefined) {
      userRatingsMap.set(restaurant.id, restaurant.user_rating);
    }
  });
  
  // In a real implementation, this would use a matrix factorization technique
  // like SVD or ALS to build a model of user preferences
  
  // For this demo, we'll use a combination of the other methods
  const contentRecs = getContentBasedRecommendations(userRestaurants, allRestaurants);
  const collabRecs = getCollaborativeFilteringRecommendations(userRestaurants, allRestaurants);
  
  // Combine and deduplicate
  const recommendationMap = new Map();
  
  // Add content-based recs with a higher weight
  contentRecs.forEach((rec, index) => {
    recommendationMap.set(rec.id, {
      restaurant: rec,
      score: (contentRecs.length - index) * 1.5 // Weight content-based higher
    });
  });
  
  // Add collaborative recs
  collabRecs.forEach((rec, index) => {
    const existingRec = recommendationMap.get(rec.id);
    if (existingRec) {
      // If already in the map, add to the score
      existingRec.score += (collabRecs.length - index);
    } else {
      recommendationMap.set(rec.id, {
        restaurant: rec,
        score: (collabRecs.length - index)
      });
    }
  });
  
  // Convert back to array and sort by score
  const recommendations = Array.from(recommendationMap.values())
    .sort((a, b) => b.score - a.score)
    .map(item => {
      const restaurant = item.restaurant;
      
      // Add user rating if available
      if (userRatingsMap.has(restaurant.id)) {
        return {
          ...restaurant,
          user_rating: userRatingsMap.get(restaurant.id)
        };
      }
      return restaurant;
    })
    .slice(0, 10); // Get top 10 recommendations
    
  return recommendations;
}

/**
 * Get similar users based on restaurant preferences.
 * 
 * @param {Array} userRestaurants - Restaurants that user has interacted with
 * @param {string} algorithm - The algorithm to use for similarity calculation
 * @returns {Array} - List of similar users
 */
export function getSimilarUsers(userRestaurants, algorithm) {
  // In a real app, this would query a database of users and compare
  // their preferences with the current user's preferences
  
  // For this demo, we'll return some example users with pseudo-random similarity scores
  const algorithmFactor = algorithm === 'matrix' ? 0.9 : algorithm === 'collaborative' ? 0.8 : 0.7;
  
  // Generate a seed based on the user's restaurants to keep results consistent
  const seed = userRestaurants.reduce((acc, restaurant) => acc + restaurant.id.charCodeAt(0), 0);
  
  // Create some simulated users
  return [
    {
      user_id: `u-${(seed % 1000).toString().padStart(3, '0')}`,
      name: "Alice Chen",
      average_stars: 4.2 + (seed % 10) / 10,
      yelping_since: "2018-05-12",
      similarity: 0.92 * algorithmFactor
    },
    {
      user_id: `u-${((seed + 123) % 1000).toString().padStart(3, '0')}`,
      name: "Bob Smith",
      average_stars: 3.8 + ((seed + 1) % 10) / 10,
      yelping_since: "2019-02-20",
      similarity: 0.85 * algorithmFactor
    },
    {
      user_id: `u-${((seed + 456) % 1000).toString().padStart(3, '0')}`,
      name: "Carol Johnson",
      average_stars: 4.5 + ((seed + 2) % 10) / 10,
      yelping_since: "2017-11-04",
      similarity: 0.78 * algorithmFactor
    },
    {
      user_id: `u-${((seed + 789) % 1000).toString().padStart(3, '0')}`,
      name: "David Garcia",
      average_stars: 4.0 + ((seed + 3) % 10) / 10,
      yelping_since: "2020-03-15",
      similarity: 0.73 * algorithmFactor
    }
  ].sort((a, b) => b.similarity - a.similarity);
}

// Helper function to get cuisine preferences from user restaurants
function getCuisinePreferences(userRestaurants) {
  const preferences = new Set();
  userRestaurants.forEach(restaurant => {
    if (restaurant.categories) {
      const cats = Array.isArray(restaurant.categories)
        ? restaurant.categories
        : restaurant.categories.split(', ');
        
      cats.forEach(category => {
        preferences.add(category.trim().toLowerCase());
      });
    }
  });
  return preferences;
}

// Helper function to get price preferences from user restaurants
function getPricePreferences(userRestaurants) {
  const preferences = new Set();
  userRestaurants.forEach(restaurant => {
    if (restaurant.attributes && restaurant.attributes.RestaurantsPriceRange2) {
      preferences.add(restaurant.attributes.RestaurantsPriceRange2);
    }
  });
  // If no price preferences found, assume all price ranges
  if (preferences.size === 0) {
    for (let i = 1; i <= 4; i++) {
      preferences.add(i.toString());
    }
  }
  return preferences;
}

// Helper function to handle undefined or missing values
export function safeGet(obj, path, defaultValue = null) {
  const pathArray = Array.isArray(path) ? path : path.split('.');
  let result = obj;
  
  for (const key of pathArray) {
    if (result === undefined || result === null || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result === undefined ? defaultValue : result;
} 