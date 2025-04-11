import { loadRestaurantsFromCsv } from "@/lib/server/loadRestaurantData";
import SavedPageClient from "@/components/SavedPageClient";

export default async function SavedPage() {
  // Load data directly in the Server Component
  const restaurantData = loadRestaurantsFromCsv();
  
  // Pass data to client component
  return <SavedPageClient initialRestaurants={restaurantData} />;
}

