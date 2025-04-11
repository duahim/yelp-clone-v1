// This file contains server-side only code for loading restaurant data
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

/**
 * Loads restaurant data from CSV file (server-side only)
 * @returns {Array} Array of restaurant objects
 */
function loadRestaurantsFromCsv() {
  try {
    // Define San Jose coordinates for distance calculation
    const websiteLat = 37.3375381;
    const websiteLon = -121.8923216;
    
    // Read the CSV file
    const filePath = path.join(process.cwd(), 'data/processed/business_processed.csv');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse the CSV content
    const records = parse(fileContent, { columns: true });
    
    console.log(`Read ${records.length} total records from CSV`);
    
    // Filter for only restaurants by checking categories
    const restaurantRecords = records.filter((record) => {
      try {
        if (record.categories_list && record.categories_list !== '[]') {
          return record.categories_list.toLowerCase().includes('restaurant');
        }
        return false;
      } catch {
        return false;
      }
    });
    
    console.log(`Found ${restaurantRecords.length} restaurant records`);
    
    // Transform CSV records to Restaurant objects
    const transformedRestaurants = restaurantRecords.map((record) => {
      // Extract categories array
      let categories = [];
      try {
        if (record.categories_list && record.categories_list !== '[]') {
          // Remove the brackets and split by commas
          const categoriesStr = record.categories_list
            .replace('[', '')
            .replace(']', '')
            .replace(/'/g, '');
          categories = categoriesStr.split(',').map((cat) => cat.trim());
        }
      } catch (error) {
        console.error("Error parsing categories:", error);
      }
      
      // Create a restaurant object
      const restaurant = {
        id: record.business_id || "", // Important: Preserve the original business_id
        name: record.name || "Unknown Restaurant",
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
          display_address: [record.city || "", record.state || ""],
        },
        phone: "",
        is_open: true,
        opening_time: "9:00 AM", // Default values
        closing_time: "9:00 PM",
        categories: categories,
        transactions: [],
        attributes: [],
        photos: [
          "/placeholder.svg?height=400&width=600",
          "/placeholder.svg?height=400&width=600",
          "/placeholder.svg?height=400&width=600",
        ],
        description: `${record.name} is a restaurant located in ${record.city}, ${record.state}.`,
        menu_items: [
          {
            name: "Sample Item",
            description: "A delicious sample menu item",
            price: 9.99,
            image_url: "/placeholder.svg?height=200&width=200",
          }
        ],
        reviews: [],
      };
      
      // Calculate distance
      const distance = calculateDistance(
        websiteLat,
        websiteLon,
        restaurant.coordinates.latitude,
        restaurant.coordinates.longitude
      );
      
      return {
        ...restaurant,
        distance
      };
    });
    
    // Sort by distance
    const sortedRestaurants = [...transformedRestaurants]
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    
    console.log(`Loaded ${sortedRestaurants.length} restaurants from CSV data`);
    
    return sortedRestaurants;
  } catch (error) {
    console.error("Error loading restaurants from CSV:", error);
    return [];
  }
}

// Calculate Euclidean distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  // Use Haversine formula for better geographic distance calculation
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Add a function to get a mapping between CSV business IDs and our restaurant IDs

/**
 * Creates a mapping between business IDs from the CSV and restaurant IDs in our data
 * This is needed because the IDs in the ratings CSV might not match our restaurant IDs
 */
function getBusinessIdMapping() {
  try {
    // On real implementation, this would read both datasets and create a proper mapping
    // For this demo, we'll create a simple demo mapping
    const fs = require('fs');
    const path = require('path');
    const { parse } = require('csv-parse/sync');
    
    // Read the CSV business data
    const businessCsvPath = path.join(process.cwd(), 'data', 'processed', 'business_processed.csv');
    if (!fs.existsSync(businessCsvPath)) {
      console.error('Business CSV file not found:', businessCsvPath);
      return {};
    }
    
    // Read the first 100 lines of the business data to get some IDs
    const businessFileContent = fs.readFileSync(businessCsvPath, 'utf8');
    const businesses = parse(businessFileContent, { 
      columns: true,
      skip_empty_lines: true,
      to: 100  // Limit to first 100 businesses
    });
    
    if (!businesses || businesses.length === 0) {
      console.error('No businesses found in CSV');
      return {};
    }
    
    // Read the restaurant data JSON
    const restaurantsJsonPath = path.join(process.cwd(), 'data', 'raw', 'restaurants.json');
    let restaurants = [];
    
    if (fs.existsSync(restaurantsJsonPath)) {
      try {
        const restaurantsJson = fs.readFileSync(restaurantsJsonPath, 'utf8');
        restaurants = JSON.parse(restaurantsJson);
      } catch (e) {
        console.error('Error reading restaurants JSON:', e);
      }
    }
    
    // For demo purposes, map each business ID to a random restaurant ID
    // In a real implementation, you would use meaningful mapping based on names, addresses, etc.
    const mapping = {};
    const restaurantIds = restaurants.length > 0 
      ? restaurants.map(r => r.id)
      : ["Ik_0Y-TL1E0PkB4mUv_PTg", "C0YcA2G_gTT8-1zRQQYn9Q", "a5T9tM-we29tYKDgOJ5y1Q"]; // Fallback IDs
      
    businesses.forEach(business => {
      if (business.business_id) {
        // Map to a random restaurant ID from our dataset
        const randomIndex = Math.floor(Math.random() * restaurantIds.length);
        mapping[business.business_id] = restaurantIds[randomIndex];
      }
    });
    
    console.log(`Created mapping for ${Object.keys(mapping).length} business IDs`);
    return mapping;
  } catch (error) {
    console.error('Error creating business ID mapping:', error);
    return {};
  }
}

// Cache the mapping so we don't recalculate it for every request
let businessIdMapping = null;

function getBusinessMappingCached() {
  if (!businessIdMapping) {
    businessIdMapping = getBusinessIdMapping();
  }
  return businessIdMapping;
}

// Export the mapping function
module.exports = {
  loadRestaurantsFromCsv,
  calculateDistance
}; 