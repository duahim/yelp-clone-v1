# Yelp Clone - Restaurant Recommendation System

A modern web application built with Next.js that provides restaurant recommendations using machine learning techniques. This project implements a comprehensive recommendation system with multiple algorithms and real-time user interactions. CS 6140 - ML - Spring 2025 Project.

## Features

### Core Features
- Restaurant search and discovery with category-based filtering
- Personalized recommendations using multiple ML algorithms
- User authentication and profile management
- Restaurant details and reviews
- Save and like restaurants with real-time updates
- Recommendation explanations and process logging
- Modern UI with dark/light theme support

### Recommendation System
The application implements a sophisticated multi-level recommendation system:

1. **Content-Based Filtering (Level 1)**
   - TF-IDF based recommendations
   - Latent Semantic Analysis (LSA)
   - Sentence Transformer embeddings
   - Uses restaurant features, reviews, and sentiment analysis
   - Real-time recommendation process logging

2. **Collaborative Filtering (Level 2)**
   - User-based collaborative filtering
   - Item-based collaborative filtering with fallback mechanism
   - Similarity caching for performance optimization
   - Dynamic threshold adjustment based on data sparsity
   - Similar users display with similarity scores

3. **Matrix Factorization (Level 3)**
   - SVD implementation with user/item biases
   - SVD with PCA dimensionality reduction
   - Latent factor-based user similarity
   - Advanced training data selection
   - Real-time recommendation updates

4. **Hybrid Methods (Level 4)**
   - Weighted hybrid combining multiple methods
   - Switching hybrid for dynamic method selection
   - Score normalization and combination
   - Source contribution tracking

5. **Clustering (Level 5)**
   - K-means clustering implementation
   - Automatic cluster size optimization
   - Feature-based restaurant grouping
   - Cluster rebalancing

### Data Processing
- CSV-based data management for users, businesses, and ratings
- Real-time data synchronization between server and client
- Efficient caching mechanisms for recommendations
- Automatic data refresh on user interactions

## Tech Stack

### Frontend
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Radix UI components
- Recharts for data visualization

### Backend
- Next.js API routes
- Python ML libraries (via requirements.txt)
  - scikit-learn
  - sentence-transformers
  - pandas
  - textblob
  - numpy
  - torch
  - scipy
  - matplotlib

### Data Management
- CSV-based data storage
- Local storage for user preferences
- Server-side caching for recommendations
- Real-time data synchronization

## Project Structure

```
yelp-clone-v1/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── recommendations/  # Recommendation endpoints
│   │   ├── restaurants/     # Restaurant data endpoints
│   │   └── users/          # User management endpoints
│   ├── restaurant/        # Restaurant pages
│   ├── search/           # Search functionality
│   └── my-list/          # User's saved restaurants
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── restaurant-list-item.tsx
│   ├── recommendation-logs.tsx
│   └── ...
├── config/               # Configuration files
├── lib/                  # Utility libraries
│   ├── server/          # Server-side utilities
│   │   ├── recommendation/  # Recommendation algorithms
│   │   └── utils/          # Utility functions
│   └── liked-restaurants-manager.ts  # Like management
├── public/              # Static assets
├── styles/              # Global styles
└── util/                # Utility functions
```

## Getting Started

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd yelp-clone-v1
   ```

2. Install dependencies:
   ```bash
   npm install
   pip install -r requirements.txt
   ```

3. Prepare your data:
   - Place your Yelp dataset files in the appropriate directories:
     - `data/processed/user_processed.csv`
     - `data/processed/ratings_processed.csv`
     - `data/processed/business_processed.csv`
     - `data/processed/reviews_processed.csv`

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Recommendation System Details

### Content-Based Filtering
- Uses TF-IDF, LSA, and Sentence Transformer methods
- Processes restaurant features and reviews
- Implements sentiment analysis
- Provides detailed recommendation explanations

### Collaborative Filtering
- User-based and item-based approaches
- Dynamic threshold adjustment
- Similarity caching
- Fallback mechanisms for sparse data

### Matrix Factorization
- Custom SGD implementation
- User/item biases
- Early stopping
- Regularization
- Latent factor-based user similarity

### Hybrid Methods
- Weighted combination of multiple methods
- Score normalization
- Source contribution tracking
- Dynamic method selection

### Clustering
- Custom K-means implementation
- Automatic cluster size optimization
- Feature-based grouping
- Rebalancing for minimum cluster size

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.