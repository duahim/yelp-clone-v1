// This file contains functions for generating recommendations based on user interactions

// Get recommended restaurants based on a user's liked or saved restaurants
export function getRecommendedRestaurants(userRestaurants, allRestaurants) {
  // If the user has no liked/saved restaurants, return empty array
  if (!userRestaurants || userRestaurants.length === 0) {
    return []
  }

  // Extract categories from user's restaurants
  const userCategories = new Set()
  userRestaurants.forEach((restaurant) => {
    restaurant.categories.forEach((category) => {
      userCategories.add(category)
    })
  })

  // Find restaurants that match user's preferred categories but aren't already in their list
  const userRestaurantIds = new Set(userRestaurants.map((r) => r.id))

  const recommendations = allRestaurants
    .filter((restaurant) => {
      // Skip if user already has this restaurant
      if (userRestaurantIds.has(restaurant.id)) {
        return false
      }

      // Check if restaurant has any categories matching user preferences
      return restaurant.categories.some((category) => userCategories.has(category))
    })
    // Sort by rating (highest first)
    .sort((a, b) => b.rating - a.rating)
    // Limit to 5 recommendations
    .slice(0, 5)

  return recommendations
}

// Get similar users based on restaurant preferences
export function getSimilarUsers(userRestaurants) {
  // In a real app, this would query a database of users
  // For this demo, we'll generate some mock similar users

  // If the user has no liked/saved restaurants, return empty array
  if (!userRestaurants || userRestaurants.length === 0) {
    return []
  }

  // Extract categories from user's restaurants
  const userCategories = new Set()
  userRestaurants.forEach((restaurant) => {
    restaurant.categories.forEach((category) => {
      userCategories.add(category)
    })
  })

  // Create mock similar users based on categories
  const similarUsers = [
    {
      id: "su1",
      name: "Alex Johnson",
      image_url: "/placeholder.svg?height=100&width=100",
      review_count: 42,
      common_categories: Array.from(userCategories).slice(0, 2),
    },
    {
      id: "su2",
      name: "Jamie Smith",
      image_url: "/placeholder.svg?height=100&width=100",
      review_count: 87,
      common_categories: Array.from(userCategories).slice(0, 2),
    },
    {
      id: "su3",
      name: "Taylor Wilson",
      image_url: "/placeholder.svg?height=100&width=100",
      review_count: 63,
      common_categories: Array.from(userCategories).slice(0, 2),
    },
    {
      id: "su4",
      name: "Jordan Lee",
      image_url: "/placeholder.svg?height=100&width=100",
      review_count: 29,
      common_categories: Array.from(userCategories).slice(0, 2),
    },
  ]

  return similarUsers
}

