"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Heart, Bookmark, Search, Filter, MapPin, Star } from "lucide-react"
import { Restaurant, initializeRestaurants } from "@/data/restaurantsFromCsv"
import { saveUserInteraction, getUserLikedRestaurants, getUserSavedRestaurants } from "@/lib/user-interactions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function SearchPageClient({ initialRestaurants }: { initialRestaurants: Restaurant[] }) {
  // Initialize global restaurants data
  useEffect(() => {
    if (initialRestaurants && initialRestaurants.length > 0) {
      initializeRestaurants(initialRestaurants);
    }
  }, [initialRestaurants]);

  const searchParams = useSearchParams()
  const category = searchParams.get("category") || ""
  
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([])
  const [userLikes, setUserLikes] = useState<string[]>([])
  const [userSaved, setUserSaved] = useState<string[]>([])
  const userId = "user123" // In a real app, this would be the actual user ID
  
  // Filter restaurants based on search category
  useEffect(() => {
    let filtered = [...initialRestaurants]
    
    if (category) {
      filtered = filtered.filter((restaurant) =>
        Array.isArray(restaurant.categories) 
          ? restaurant.categories.some((cat) => cat.toLowerCase().includes(category.toLowerCase()))
          : false
      )
    }
    
    if (searchTerm) {
      filtered = filtered.filter(
        (restaurant) =>
          restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (Array.isArray(restaurant.categories) &&
            restaurant.categories.some((cat) => cat.toLowerCase().includes(searchTerm.toLowerCase())))
      )
    }
    
    setFilteredRestaurants(filtered)
  }, [category, searchTerm, initialRestaurants])
  
  // Get user interactions
  useEffect(() => {
    const likedIds = getUserLikedRestaurants(userId)
    const savedIds = getUserSavedRestaurants(userId)
    setUserLikes(likedIds)
    setUserSaved(savedIds)
  }, [userId])
  
  const handleLike = (restaurantId: string) => {
    const isLiked = userLikes.includes(restaurantId)
    const action = isLiked ? "unlike" : "like"
    
    saveUserInteraction({
      userId,
      restaurantId,
      action,
      timestamp: new Date().toISOString(),
    })
    
    // Update local state
    if (isLiked) {
      setUserLikes(userLikes.filter((id) => id !== restaurantId))
    } else {
      setUserLikes([...userLikes, restaurantId])
    }
  }
  
  const handleSave = (restaurantId: string) => {
    const isSaved = userSaved.includes(restaurantId)
    const action = isSaved ? "unsave" : "save"
    
    saveUserInteraction({
      userId,
      restaurantId,
      action,
      timestamp: new Date().toISOString(),
    })
    
    // Update local state
    if (isSaved) {
      setUserSaved(userSaved.filter((id) => id !== restaurantId))
    } else {
      setUserSaved([...userSaved, restaurantId])
    }
  }
  
  const handleRestaurantClick = (restaurantId: string) => {
    // Track the click
    saveUserInteraction({
      userId,
      restaurantId,
      action: "view",
      timestamp: new Date().toISOString(),
    })
  }
  
  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">
            {category ? `${category.charAt(0).toUpperCase() + category.slice(1)} Restaurants` : "All Restaurants"}
          </h1>
          
          {/* Search Inputs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search restaurants or cuisines..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="sm:w-48">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="reviews">Most Reviewed</SelectItem>
                  <SelectItem value="distance">Distance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="gap-2">
              <Filter className="h-4 w-4" /> More Filters
            </Button>
          </div>
          
          {/* Results Found */}
          <p className="text-gray-600 mb-4">{filteredRestaurants.length} restaurants found</p>
        </div>
        
        {/* Restaurant Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRestaurants.map((restaurant) => (
            <div key={restaurant.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <Link 
                href={`/restaurant/${restaurant.id}`}
                onClick={() => handleRestaurantClick(restaurant.id)}
              >
                <div className="relative h-48">
                  <Image
                    src={restaurant.image_url || "/placeholder-restaurant.jpg"}
                    alt={restaurant.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
              </Link>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <Link 
                    href={`/restaurant/${restaurant.id}`}
                    onClick={() => handleRestaurantClick(restaurant.id)}
                    className="hover:underline"
                  >
                    <h2 className="text-xl font-semibold">{restaurant.name}</h2>
                  </Link>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleLike(restaurant.id)}
                    >
                      <Heart
                        className={`h-5 w-5 ${userLikes.includes(restaurant.id) ? "fill-red-500 text-red-500" : ""}`}
                      />
                      <span className="sr-only">Like</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleSave(restaurant.id)}
                    >
                      <Bookmark
                        className={`h-5 w-5 ${userSaved.includes(restaurant.id) ? "fill-blue-500 text-blue-500" : ""}`}
                      />
                      <span className="sr-only">Save</span>
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center mt-1">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < Math.floor(restaurant.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-600">{restaurant.review_count} reviews</span>
                </div>
                
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {Array.isArray(restaurant.categories) ? (
                      restaurant.categories.map((category: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                          {category}
                        </span>
                      ))
                    ) : restaurant.categories ? (
                      String(restaurant.categories).split(', ').map((category: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                          {category}
                        </span>
                      ))
                    ) : null}
                    {restaurant.price && (
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">{restaurant.price}</span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 flex items-center mt-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>
                      {restaurant.location.city}{restaurant.location.state && `, ${restaurant.location.state}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
} 