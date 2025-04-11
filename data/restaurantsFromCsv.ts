// This file provides access to restaurant data
import { parse } from 'csv-parse/sync';

export interface Restaurant {
  id: string;
  name: string;
  image_url: string;
  url: string;
  review_count: number;
  rating: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  price: string;
  location: {
    address1: string;
    address2: string;
    address3: string;
    city: string;
    zip_code: string;
    country: string;
    state: string;
    display_address: string[];
  };
  phone: string;
  is_open: boolean;
  opening_time: string;
  closing_time: string;
  categories: string[];
  transactions: string[];
  attributes: string[];
  photos: string[];
  description: string;
  menu_items: {
    name: string;
    description: string;
    price: number;
    image_url: string;
  }[];
  reviews: {
    id: string;
    rating: number;
    user: {
      id: string;
      name: string;
      image_url: string;
    };
    text: string;
    time_created: string;
  }[];
  distance?: number;
}

// This will be populated during runtime
export let restaurants: Restaurant[] = [];

// Load restaurants from CSV in server environment
export async function loadRestaurantsFromCsv(): Promise<Restaurant[]> {
  // Only import fs and path in a server environment
  if (typeof window === 'undefined') {
    try {
      // Dynamically import Node.js modules
      const fs = require('fs');
      const path = require('path');
      
      const csvPath = path.join(process.cwd(), 'data', 'processed', 'business_processed.csv');
      
      if (!fs.existsSync(csvPath)) {
        console.warn(`CSV file not found at ${csvPath}, using mock data instead.`);
        return [];
      }
      
      const fileContent = fs.readFileSync(csvPath, 'utf-8');
      
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
      });
      
      return records.map((record: any) => {
        // Parse categories from categories_list if available
        let categories: string[] = [];
        try {
          if (record.categories_list && record.categories_list !== '[]') {
            // Remove brackets and single quotes, then split by commas
            const categoriesStr = record.categories_list
              .replace('[', '')
              .replace(']', '')
              .replace(/'/g, '');
            categories = categoriesStr.split(',').map((cat: string) => cat.trim());
          } else if (record.categories) {
            // Fall back to categories field if available
            categories = record.categories.split(',').map((cat: string) => cat.trim());
          }
        } catch (e) {
          console.warn('Error parsing categories for business:', record.business_id);
        }
        
        return {
          id: record.business_id,
          name: record.name,
          image_url: record.image_url || '/placeholder.svg?height=400&width=600',
          url: record.url || `https://www.example.com/${record.business_id || ""}`,
          review_count: parseInt(record.review_count) || 0,
          rating: parseFloat(record.stars) || 0, // Note: stars in business_processed.csv, not rating
          coordinates: {
            latitude: parseFloat(record.latitude) || 0,
            longitude: parseFloat(record.longitude) || 0
          },
          price: record.price || '$$', // Default price since it might not be in the data
          location: {
            address1: record.address || '',
            address2: '',
            address3: '',
            city: record.city || '',
            zip_code: record.postal_code || '',
            country: 'US',
            state: record.state || '',
            display_address: [
              record.address || '', 
              record.city ? `${record.city}, ${record.state || ''}` : record.state || ''
            ].filter(Boolean)
          },
          phone: record.phone || '',
          is_open: true, // Default since this info might not be available
          opening_time: '',
          closing_time: '',
          categories: categories,
          transactions: [],
          attributes: [],
          photos: [],
          description: `${record.name} is a restaurant located in ${record.city || ''}, ${record.state || ''}`.trim(),
          menu_items: [],
          reviews: []
        };
      });
    } catch (error) {
      console.error('Error loading restaurants from CSV:', error);
      return [];
    }
  }
  
  // If we're in the browser, return an empty array
  console.warn('Attempted to load CSV directly in browser environment');
  return [];
}

// Function to fetch restaurants (works in both client and server)
export async function fetchRestaurants(): Promise<Restaurant[]> {
  // In server environment, load directly from CSV
  if (typeof window === 'undefined') {
    const data = await loadRestaurantsFromCsv();
    restaurants = data;
    return restaurants;
  }
  
  // In client environment, fetch from API
  try {
    const response = await fetch('/api/restaurants');
    if (!response.ok) {
      throw new Error('Failed to fetch restaurants');
    }
    const data = await response.json();
    restaurants = data.restaurants;
    return restaurants;
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return [];
  }
}

// Export a function to get the restaurants
export function getRestaurants(): Restaurant[] {
  return restaurants;
}

export async function initializeRestaurants(category: string): Promise<Restaurant[]> {
  // Fetch restaurants from the server
  const allRestaurants = await fetchRestaurants();

  // Filter restaurants based on the category
  const filteredRestaurants = allRestaurants.filter(restaurant =>
    restaurant.categories.includes(category)
  );

  // Update the global restaurants variable
  restaurants = filteredRestaurants;
  return restaurants;
}