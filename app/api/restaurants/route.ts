import { NextResponse } from 'next/server';
import { Restaurant, loadRestaurantsFromCsv } from '@/data/restaurantsFromCsv';

// Mock restaurant data
const mockRestaurants: Restaurant[] = [
  {
    id: "1",
    name: "Sample Restaurant 1",
    image_url: "",
    url: "",
    review_count: 100,
    rating: 4.5,
    coordinates: { latitude: 0, longitude: 0 },
    price: "$$",
    location: {
      address1: "123 Main St",
      address2: "",
      address3: "",
      city: "Sample City",
      zip_code: "12345",
      country: "US",
      state: "CA",
      display_address: ["123 Main St", "Sample City, CA 12345"]
    },
    phone: "123-456-7890",
    is_open: true,
    opening_time: "09:00",
    closing_time: "21:00",
    categories: ["Restaurants", "American"],
    transactions: [],
    attributes: [],
    photos: [],
    description: "A sample restaurant",
    menu_items: [],
    reviews: []
  }
];

export async function GET() {
  try {
    // First try to load restaurants from CSV
    const csvRestaurants = await loadRestaurantsFromCsv();
    
    // If we have restaurants from the CSV, return those
    if (csvRestaurants.length > 0) {
      return NextResponse.json({ restaurants: csvRestaurants });
    }
    
    // Otherwise fall back to mock data
    return NextResponse.json({ restaurants: mockRestaurants });
  } catch (error) {
    console.error('Error returning restaurants:', error);
    return NextResponse.json(
      { error: 'Failed to load restaurants' },
      { status: 500 }
    );
  }
} 