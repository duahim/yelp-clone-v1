// Server Component - no "use client" directive
import { loadRestaurantsFromCsv } from "@/lib/server/loadRestaurantData";
import RestaurantDetailClient from "@/components/RestaurantDetailClient";
import { notFound } from "next/navigation";

// This function generates the static paths
export async function generateStaticParams() {
  try {
    // Load restaurants from CSV
    const loadedRestaurants = loadRestaurantsFromCsv();
    
    // Create paths for each restaurant ID
    return loadedRestaurants.map((restaurant) => ({
      id: restaurant.id,
    }));
  } catch (error) {
    console.error("Error in generateStaticParams:", error);
    return [];
  }
}

export default async function RestaurantPage({ params }: { params: { id: string } }) {
  // Load data directly in the Server Component
  const restaurantData = loadRestaurantsFromCsv();
  
  // Find the specific restaurant
  const restaurant = restaurantData.find(r => r.id === params.id);
  
  // If restaurant not found, show 404
  if (!restaurant) {
    return notFound();
  }
  
  // Pass data to client component
  return <RestaurantDetailClient initialRestaurants={restaurantData} restaurantId={params.id} />;
}

