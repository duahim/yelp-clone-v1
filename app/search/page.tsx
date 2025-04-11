// Server Component - no "use client" directive
import { loadRestaurantsFromCsv } from "@/lib/server/loadRestaurantData";
import SearchPageClient from "@/components/SearchPageClient";

export default async function SearchPage() {
  // Load data directly in the Server Component
  const restaurantData = loadRestaurantsFromCsv();
  
  // Pass data to client component
  return <SearchPageClient initialRestaurants={restaurantData} />;
}

