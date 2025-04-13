# Yelp Clone Next.js Application

A Yelp clone built with Next.js, TypeScript, and Tailwind CSS, featuring user authentication, restaurant browsing, and personalized recommendations using multiple recommendation algorithms.

## Features

- **Restaurant Discovery**: Browse restaurants by category or search for specific restaurants
- **Personalized Recommendations**: Three different recommendation algorithms
  - Content-based filtering
  - Collaborative filtering
  - Matrix factorization
- **User Profiles**: User login system with personalized recommendations
- **Interactive UI**: Like and save restaurants to your profile
- **Restaurant Details**: View detailed information about each restaurant

## Recommendation System

The application features a robust recommendation system with three different algorithms:

### Content-Based Filtering

Recommends restaurants similar to ones you've liked based on attributes like:
- Cuisine type
- Price range
- Location
- Other restaurant attributes

This approach creates a personalized experience based on the specific attributes of restaurants you've enjoyed.

### Collaborative Filtering

Recommends restaurants based on what similar users have liked:
- Identifies users with similar tastes
- Suggests restaurants they've rated highly that you haven't tried
- Benefits from the "wisdom of the crowd"

The system finds users with similar preferences and leverages their experiences to discover new restaurants for you.

### Matrix Factorization

A more advanced algorithm that:
- Discovers hidden patterns in user-restaurant interactions
- Decomposes the user-item matrix into latent factors
- Captures more complex relationships than simpler methods
- Balances personalization with discovery of new interests

## Technical Implementation

This application demonstrates several advanced Next.js patterns:

1. **App Router**: Uses the latest Next.js App Router for improved routing
2. **Server Components**: Leverages React Server Components for improved performance
3. **Static Generation**: Pre-renders pages at build time for faster loading
4. **Hybrid Data Fetching**: 
   - Uses server-side data loading for initial page loads
   - Client-side fetching for dynamic updates after user interactions
5. **TypeScript**: Fully typed for improved developer experience and code safety
6. **Tailwind CSS**: Utility-first CSS framework for responsive design

## Application Architecture

The codebase follows a clean separation of concerns:

- `app/`: Page components and routing configuration
- `components/`: Reusable UI components
- `lib/`: Utility functions and business logic
  - `server/`: Server-only utilities
  - `recommendation-models.js`: Implementation of recommendation algorithms
  - `user-interactions.ts`: User data management
- `data/`: Data loading and processing utilities
- `public/`: Static assets

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Data Sources

The application uses processed Yelp data in CSV format:
- Restaurant information
- User profiles
- User ratings

## Future Enhancements

Planned future improvements:
- Real user authentication system
- More sophisticated recommendation algorithms
- Mobile application using React Native
- Integration with mapping services for location-based recommendations
- Social features for sharing and recommendations 