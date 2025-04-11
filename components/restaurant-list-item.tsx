"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Star, Heart, Bookmark } from "lucide-react"
import { 
  getUserLikedRestaurants, 
  getUserSavedRestaurants, 
  toggleLikedRestaurant, 
  toggleSavedRestaurant,
  getCurrentUser
} from "@/lib/user-interactions"
import { useToast } from "@/components/ui/use-toast"
import { FaStar } from "react-icons/fa"
import { Restaurant } from "@/data/restaurantsFromCsv"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FaHeart, FaRegHeart, FaBookmark, FaRegBookmark } from "react-icons/fa"

interface RestaurantListItemProps {
  restaurant: Restaurant & { user_rating?: number }
  onLike?: (restaurant: Restaurant) => void
  onSave?: (restaurant: Restaurant) => void
  isLiked?: boolean
  isSaved?: boolean
  showActionButtons?: boolean
}

export function RestaurantListItem({
  restaurant,
  onLike,
  onSave,
  isLiked = false,
  isSaved = false,
  showActionButtons = true,
}: RestaurantListItemProps) {
  const { 
    id, 
    name, 
    image_url, 
    url, 
    review_count, 
    rating,
    categories,
    user_rating 
  } = restaurant

  // Format stars and review count for display
  const displayRating = parseFloat(rating?.toString() || "0").toFixed(1)
  const displayReviewCount = parseInt(review_count?.toString() || "0", 10)
  
  // Format user rating if available
  const displayUserRating = user_rating 
    ? parseFloat(user_rating.toString()).toFixed(1) 
    : null
    
  console.log(`Restaurant ${name} - rating: ${rating} (${displayRating}), user_rating: ${user_rating} (${displayUserRating})`)

  const [isLikedState, setIsLikedState] = useState(isLiked)
  const [isSavedState, setIsSavedState] = useState(isSaved)
  const [userId, setUserId] = useState<string | null>(null)
  const { toast } = useToast()

  // Check if the restaurant is liked/saved when the component mounts
  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      setUserId(user.user_id)
      
      // Check if the restaurant is liked
      const likedRestaurants = getUserLikedRestaurants(user.user_id)
      setIsLikedState(likedRestaurants.includes(id))
      
      // Check if the restaurant is saved
      const savedRestaurants = getUserSavedRestaurants(user.user_id)
      setIsSavedState(savedRestaurants.includes(id))
    }
  }, [id])

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!userId) {
      toast({
        title: "Please log in",
        description: "You need to log in to like restaurants",
        variant: "destructive",
      })
      return
    }
    
    console.log(`Toggling like state for restaurant ${name} (${id})`);
    const newState = toggleLikedRestaurant(userId, id)
    setIsLikedState(newState)
    console.log(`Like state changed to: ${newState ? 'liked' : 'unliked'} for ${name}`);
    
    toast({
      title: newState ? "Restaurant Liked" : "Restaurant Unliked",
      description: newState 
        ? `You have liked ${name}` 
        : `You have removed ${name} from your liked restaurants`,
    })
  }

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!userId) {
      toast({
        title: "Please log in",
        description: "You need to log in to save restaurants",
        variant: "destructive",
      })
      return
    }
    
    const newState = toggleSavedRestaurant(userId, id)
    setIsSavedState(newState)
    
    toast({
      title: newState ? "Restaurant Saved" : "Restaurant Unsaved",
      description: newState 
        ? `You have saved ${name} for later` 
        : `You have removed ${name} from your saved restaurants`,
    })
  }

  const handleItemClick = () => {
    if (onLike) {
      onLike(restaurant)
    }
  }

  return (
    <div className="restaurant-item bg-white rounded-lg shadow-md overflow-hidden border">
      <div className="relative h-48 w-full">
        <Image
          src={image_url || "/placeholder-restaurant.jpg"}
          alt={name}
          fill
          style={{ objectFit: "cover" }}
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-1 truncate">
          <Link href={`/restaurants/${id}`}>{name}</Link>
        </h3>
        <div className="flex items-center mb-2">
          <div className="flex items-center">
            <FaStar className="text-yellow-500 mr-1" />
            <span>{displayRating}</span>
          </div>
          <span className="mx-2 text-gray-400">•</span>
          <span className="text-gray-600">{displayReviewCount} reviews</span>
        </div>
        
        {displayUserRating && (
          <div className="mb-2 p-2 bg-gray-50 rounded border border-gray-200">
            <p className="text-sm font-medium">Your rating: <span className="font-bold text-yellow-600">{displayUserRating} <FaStar className="inline text-yellow-500" size={12} /></span></p>
          </div>
        )}
        
        <div className="text-sm text-gray-500 mb-3">
          {categories?.join(', ') || 'Restaurant'}
        </div>
        
        {showActionButtons && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLikeClick}
              className={cn(isLikedState && "text-red-500 border-red-200 bg-red-50")}
            >
              {isLikedState ? <FaHeart className="mr-2" /> : <FaRegHeart className="mr-2" />}
              Like
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveClick}
              className={cn(isSavedState && "text-blue-500 border-blue-200 bg-blue-50")}
            >
              {isSavedState ? <FaBookmark className="mr-2" /> : <FaRegBookmark className="mr-2" />}
              Save
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

