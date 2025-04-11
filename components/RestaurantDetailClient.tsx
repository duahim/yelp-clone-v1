"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { MapPin, Star, Clock, Phone, Globe, Heart, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Restaurant, initializeRestaurants } from "@/data/restaurantsFromCsv"
import { saveUserInteraction } from "@/lib/user-interactions"

// The component now receives the restaurant data from props
export default function RestaurantDetailClient({ initialRestaurants, restaurantId }: { initialRestaurants: Restaurant[], restaurantId: string }) {
  // Initialize restaurants data with what we got from the server component
  useEffect(() => {
    if (initialRestaurants && initialRestaurants.length > 0) {
      initializeRestaurants(initialRestaurants);
    }
  }, [initialRestaurants]);
  
  // The rest of your component uses the restaurants array
  const [restaurant, setRestaurant] = useState<Restaurant | undefined>(undefined)
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    // Find restaurant by ID (should be guaranteed to exist)
    const foundRestaurant = initialRestaurants.find((r) => r.id === restaurantId)
    setRestaurant(foundRestaurant)
  }, [restaurantId, initialRestaurants])

  const handleLike = () => {
    setIsLiked(!isLiked)
    saveUserInteraction({
      userId: "user123", // In a real app, this would be the actual user ID
      restaurantId,
      action: !isLiked ? "like" : "unlike",
      timestamp: new Date().toISOString(),
    })
  }

  const handleSave = () => {
    setIsSaved(!isSaved)
    saveUserInteraction({
      userId: "user123", // In a real app, this would be the actual user ID
      restaurantId,
      action: !isSaved ? "save" : "unsave",
      timestamp: new Date().toISOString(),
    })
  }

  if (!restaurant) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  return (
    <main className="flex-1">
      <div className="bg-gray-100">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Image
                    src={restaurant.image_url || "/placeholder-restaurant.jpg"}
                    alt={restaurant.name}
                    width={800}
                    height={500}
                    className="w-full h-80 object-cover rounded-lg"
                  />
                </div>
                {restaurant.photos?.slice(0, 4).map((photo: string, index: number) => (
                  <Image
                    key={index}
                    src={photo || "/placeholder-food.jpg"}
                    alt={`${restaurant.name} photo ${index + 1}`}
                    width={400}
                    height={300}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h1 className="text-3xl font-bold">{restaurant.name}</h1>
              <div className="flex items-center mt-2">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i < Math.floor(restaurant.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                    />
                  ))}
                </div>
                <span className="ml-2 text-gray-600">{restaurant.review_count} reviews</span>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {restaurant.categories.map((category: string, index: number) => (
                  <span key={index} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                    {category}
                  </span>
                ))}
                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">{restaurant.price}</span>
              </div>

              <div className="mt-4 text-gray-600">
                {restaurant.is_open ? (
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-green-600" />
                    <span className="text-green-600">Open until {restaurant.closing_time}</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-red-600" />
                    <span className="text-red-600">Closed</span>
                  </div>
                )}
              </div>

              <div className="mt-2 text-gray-600 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                <span>
                  {restaurant.location.address1}, {restaurant.location.city}, {restaurant.location.state}{" "}
                  {restaurant.location.zip_code}
                </span>
              </div>

              <div className="mt-2 text-gray-600 flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                <span>{restaurant.phone}</span>
              </div>

              {restaurant.url && (
                <div className="mt-2 text-gray-600 flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  <a
                    href={restaurant.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {restaurant.url.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <Button
                  variant="outline"
                  className={`flex-1 ${isLiked ? "text-red-500 border-red-500" : ""}`}
                  onClick={handleLike}
                >
                  <Heart className={`h-5 w-5 mr-2 ${isLiked ? "fill-current" : ""}`} />
                  {isLiked ? "Liked" : "Like"}
                </Button>
                <Button
                  variant="outline"
                  className={`flex-1 ${isSaved ? "text-blue-500 border-blue-500" : ""}`}
                  onClick={handleSave}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill={isSaved ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                  </svg>
                  {isSaved ? "Saved" : "Save"}
                </Button>
                <Button variant="outline" className="flex-1">
                  <Share2 className="h-5 w-5 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="about">
          <TabsList className="mb-6">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
          </TabsList>
          <TabsContent value="about">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <h2 className="text-2xl font-bold mb-4">About {restaurant.name}</h2>
                <p className="text-gray-700 mb-6">
                  {restaurant.description ||
                    `${restaurant.name} is a ${restaurant.categories.join(", ")} restaurant located in ${restaurant.location.city}. They offer a variety of delicious dishes in a welcoming atmosphere.`}
                </p>

                <h3 className="text-xl font-semibold mb-3">Location & Hours</h3>
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="bg-gray-200 h-48 rounded-lg mb-2">
                      {/* Map would go here in a real implementation */}
                      <div className="h-full flex items-center justify-center text-gray-500">Map View</div>
                    </div>
                    <p className="text-gray-700">
                      {restaurant.location.address1}
                      <br />
                      {restaurant.location.city}, {restaurant.location.state} {restaurant.location.zip_code}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Hours</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Monday</div>
                      <div>11:00 AM - 10:00 PM</div>
                      <div>Tuesday</div>
                      <div>11:00 AM - 10:00 PM</div>
                      <div>Wednesday</div>
                      <div>11:00 AM - 10:00 PM</div>
                      <div>Thursday</div>
                      <div>11:00 AM - 10:00 PM</div>
                      <div>Friday</div>
                      <div>11:00 AM - 11:00 PM</div>
                      <div>Saturday</div>
                      <div>10:00 AM - 11:00 PM</div>
                      <div>Sunday</div>
                      <div>10:00 AM - 9:00 PM</div>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-semibold mb-3">Amenities and More</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {restaurant.attributes?.map((attribute: string, index: number) => (
                    <div key={index} className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 text-green-600"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{attribute}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">You Might Also Consider</h3>
                  <div className="space-y-4">
                    {initialRestaurants
                      .filter(
                        (r) => r.id !== restaurant.id && r.categories.some((c) => restaurant.categories.includes(c)),
                      )
                      .slice(0, 3)
                      .map((similarRestaurant) => (
                        <Link
                          key={similarRestaurant.id}
                          href={`/restaurant/${similarRestaurant.id}`}
                          className="flex gap-3 hover:bg-gray-100 p-2 rounded-lg"
                        >
                          <Image
                            src={similarRestaurant.image_url || "/placeholder-restaurant.jpg"}
                            alt={similarRestaurant.name}
                            width={80}
                            height={80}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div>
                            <h4 className="font-medium">{similarRestaurant.name}</h4>
                            <div className="flex items-center mt-1">
                              <div className="flex">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${i < Math.floor(similarRestaurant.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                                  />
                                ))}
                              </div>
                              <span className="ml-1 text-xs text-gray-600">{similarRestaurant.review_count}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {similarRestaurant.categories.slice(0, 2).join(", ")}
                            </p>
                          </div>
                        </Link>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="menu">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-2xl font-bold mb-4">Menu</h2>
                <p className="text-gray-700 mb-6">Popular items from {restaurant.name}</p>

                <div className="space-y-6">
                  {restaurant.menu_items?.map((item: {name: string; description: string; price: number; image_url: string}, index: number) => (
                    <div key={index} className="flex gap-4">
                      <Image
                        src={item.image_url || "/placeholder-food.jpg"}
                        alt={item.name}
                        width={120}
                        height={120}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        <p className="font-medium mt-2">${item.price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="reviews">
            <h2 className="text-2xl font-bold mb-4">Reviews</h2>
            <div className="space-y-6">
              {restaurant.reviews?.map((review: {
                id: string;
                rating: number;
                user: {
                  id: string;
                  name: string;
                  image_url: string;
                };
                text: string;
                time_created: string;
              }, index: number) => (
                <div key={index} className="border-b pb-6">
                  <div className="flex items-center gap-4">
                    <Image
                      src={review.user.image_url || "/placeholder-user.jpg"}
                      alt={review.user.name}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-semibold">{review.user.name}</h3>
                      <div className="flex items-center mt-1">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < Math.floor(review.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                            />
                          ))}
                        </div>
                        <span className="ml-2 text-sm text-gray-600">
                          {new Date(review.time_created).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-gray-700">{review.text}</p>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="photos">
            <h2 className="text-2xl font-bold mb-4">Photos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {restaurant.photos?.map((photo: string, index: number) => (
                <Image
                  key={index}
                  src={photo || "/placeholder-food.jpg"}
                  alt={`${restaurant.name} photo ${index + 1}`}
                  width={300}
                  height={300}
                  className="w-full h-64 object-cover rounded-lg"
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
} 