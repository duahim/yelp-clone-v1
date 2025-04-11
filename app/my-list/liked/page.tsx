// Server Component - no "use client" directive
import { loadRestaurantsFromCsv } from "@/lib/server/loadRestaurantData";
import LikedPageClient from "@/components/LikedPageClient";


export default async function LikedPage() {
  // Load data directly in the Server Component
  const restaurantData = loadRestaurantsFromCsv();
  
  // Pass data to client component
  return <LikedPageClient initialRestaurants={restaurantData} />;
}

