import React from 'react';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

interface User {
  user_id: string;
  name: string;
  review_count: number;
  average_stars: number;
  friends: string;
}

interface Rating {
  user_id: string;
  business_id: string;
  rating: number;
}

interface Business {
  business_id: string;
  name: string;
  city: string;
  state: string;
  stars: number;
  review_count: number;
  categories: string;
  latitude: number;
  longitude: number;
  categories_list: string;
}

interface Review {
  review_id: string;
  user_id: string;
  business_id: string;
  review_text: string;
}

// Server Component
export default async function MorePage() {
  // Load data from CSV files
  const userData = loadUserData();
  const ratingsData = loadRatingsData();
  const businessData = loadBusinessData();
  const reviewsData = loadReviewsData();

  // Calculate statistics
  const avgReviewsPerUser = userData.reduce((acc: number, user: User) => acc + Number(user.review_count), 0) / userData.length;
  const uniqueStates = new Set(businessData.map((b: Business) => b.state)).size;
  const avgRating = ratingsData.reduce((acc: number, r: Rating) => acc + Number(r.rating), 0) / ratingsData.length;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <h1 className="text-4xl font-bold text-center mb-12">Recommendation System Overview</h1>

      <div className="flex flex-col md:flex-row gap-8 relative">
        {/* Left sidebar with guide elements */}
        <div className="md:w-1/3 space-y-8">
          <div className="bg-emerald-400 text-white font-bold py-2 px-4 rounded w-max">
            INDEX
          </div>
          <div className="mt-2 bg-white border rounded p-4 shadow-sm">
            <ul className="list-disc pl-5 space-y-2">
              <li><a href="#introduction">Introduction</a></li>
              <li><a href="#content-based">Level 1: Content-Based Filtering</a></li>
              <li><a href="#collaborative">Level 2: Collaborative Filtering</a></li>
              <li><a href="#matrix">Level 3: Matrix Factorization</a></li>
              <li><a href="#hybrid">Level 4: Hybrid Methods</a></li>
              <li><a href="#clustering">Level 5: Clustering</a></li>
              <li><a href="#conclusion">Conclusion</a></li>
            </ul>
          </div>
        </div>

        {/* Main content area */}
        <div className="md:w-2/3 border rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 space-y-8">
            <section id="introduction" className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-3xl font-bold mb-4 text-emerald-600">Introduction</h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">Our journey into building a comprehensive recommendation system began with the goal of creating a Yelp clone focused on restaurant discovery. This document outlines the detailed timeline, thought process, and the pros and cons of each level of the recommendation systems we developed.</p>
                <p className="text-gray-700 leading-relaxed">The system was designed with five distinct levels of recommendation algorithms, each building upon the previous one to provide increasingly sophisticated and personalized restaurant suggestions.</p>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <h3 className="text-xl font-semibold text-emerald-700 mb-2">System Overview</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                      Content-Based Filtering
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                      Collaborative Filtering
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                      Matrix Factorization
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                      Hybrid Methods
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                      Clustering Techniques
                    </li>
                  </ul>
                </div>

                <div className="bg-emerald-50 p-4 rounded-lg">
                  <h3 className="text-xl font-semibold text-emerald-700 mb-2">Key Features</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                      Implementation Details
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                      Performance Metrics
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                      Challenge Solutions
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                      Visual Analytics
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                      Future Improvements
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-2xl font-bold text-emerald-600 mb-4">Dataset Overview</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-emerald-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">Metric</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Total Users</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">{userData.length}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Average Reviews per User</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">{avgReviewsPerUser.toFixed(1)}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Total Businesses</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">{businessData.length}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">States Covered</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">{uniqueStates}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Total Ratings</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">{ratingsData.length}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Average Rating</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">{avgRating.toFixed(1)} stars</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Total Reviews</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">{reviewsData.length}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section id="content-based" className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-3xl font-bold mb-4 text-emerald-600">Level 1: Content-Based Filtering</h2>
              <p className="text-gray-700 leading-relaxed mb-6">Content-based filtering leverages the features of items to recommend similar items. We implemented three distinct methods to analyze restaurant reviews and attributes:</p>
              
              <div className="space-y-8">
                <div className="bg-emerald-50 p-6 rounded-lg">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">1. TF-IDF Based Recommendations</h3>
                  <p className="text-gray-700 mb-4">The Term Frequency-Inverse Document Frequency (TF-IDF) approach identifies important words in restaurant reviews to find similar items.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Key Features</h4>
                      <ul className="space-y-2">
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Processes review text to extract meaningful terms
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Calculates term importance based on frequency
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Builds item profiles from aggregated content
                        </li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Implementation</h4>
                      <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code>{`class TFIDFRecommender extends ContentBasedRecommender {
  async buildItemProfile(businessId: string): Promise<ItemProfile> {
    const reviews = await this.getBusinessReviews(businessId);
    const processedText = this.preprocessText(reviews.join(' '));
    const tfidf = this.computeTFIDF(processedText);
    const sentiment = this.calculateSentiment(reviews);
    return {
      id: businessId,
      features: tfidf,
      sentiment: sentiment
    };
  }
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 p-6 rounded-lg">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">2. Latent Semantic Analysis (LSA)</h3>
                  <p className="text-gray-700 mb-4">LSA uses singular value decomposition to identify latent concepts in restaurant reviews, allowing for recommendations even with different vocabulary.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Key Features</h4>
                      <ul className="space-y-2">
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Creates term-document matrix from reviews
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Performs dimensionality reduction using SVD
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Identifies underlying semantic patterns
                        </li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Implementation</h4>
                      <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code>{`class LSARecommender extends ContentBasedRecommender {
  async buildItemProfile(businessId: string): Promise<ItemProfile> {
    const reviews = await this.getBusinessReviews(businessId);
    const termDocMatrix = this.buildTermDocumentMatrix(reviews);
    const [U, S, V] = this.svd(termDocMatrix);
    const reducedMatrix = this.reduceDimensions(U, S, V);
    return {
      id: businessId,
      features: reducedMatrix,
      sentiment: this.calculateSentiment(reviews)
    };
  }
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 p-6 rounded-lg">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">3. Sentence Transformer</h3>
                  <p className="text-gray-700 mb-4">The Sentence Transformer approach uses neural networks to create semantic embeddings of review text.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Key Features</h4>
                      <ul className="space-y-2">
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Generates dense vector representations
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Captures semantic meaning and context
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Handles complex language patterns
                        </li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Implementation</h4>
                      <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code>{`class SentenceTransformerRecommender extends ContentBasedRecommender {
  async buildItemProfile(businessId: string): Promise<ItemProfile> {
    const reviews = await this.getBusinessReviews(businessId);
    const embeddings = await this.getEmbeddings(reviews);
    const combinedEmbedding = this.averageEmbeddings(embeddings);
    return {
      id: businessId,
      features: combinedEmbedding,
      sentiment: this.calculateSentiment(reviews)
    };
  }
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">Pros and Cons</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-emerald-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-emerald-600 mb-3">Advantages</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                          <span>Works well for new items (no cold start problem)</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                          <span>Provides transparent recommendations</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                          <span>Can capture detailed item characteristics</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                          <span>Less dependent on user interaction data</span>
                        </li>
                      </ul>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-red-600 mb-3">Limitations</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2"></span>
                          <span>May recommend items too similar to known items</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2"></span>
                          <span>Requires good quality item descriptions</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2"></span>
                          <span>Can be computationally expensive</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2"></span>
                          <span>May miss serendipitous recommendations</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="collaborative" className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-3xl font-bold mb-4 text-emerald-600">Level 2: Collaborative Filtering</h2>
              <p className="text-gray-700 leading-relaxed mb-6">Collaborative filtering relies on user interactions to recommend items. We implemented both user-based and item-based approaches:</p>
              
              <div className="space-y-8">
                <div className="bg-emerald-50 p-6 rounded-lg">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">1. User-Based Collaborative Filtering</h3>
                  <p className="text-gray-700 mb-4">This approach finds users with similar preferences and recommends items they liked.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Key Features</h4>
                      <ul className="space-y-2">
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Calculates user similarity using Pearson correlation
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Identifies nearest neighbors based on rating patterns
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Generates predictions using weighted averages
                        </li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Implementation</h4>
                      <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code>{`class UserBasedCFRecommender extends CollaborativeFilteringRecommender {
  async getRecommendations(userId: string): Promise<Recommendation[]> {
    const userRatings = await this.getUserRatings(userId);
    const similarUsers = await this.findSimilarUsers(userId);
    const predictions = await this.generatePredictions(userId, similarUsers);
    return this.filterAndSortRecommendations(predictions);
  }
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 p-6 rounded-lg">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">2. Item-Based Collaborative Filtering</h3>
                  <p className="text-gray-700 mb-4">This method recommends items similar to those the user has liked.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Key Features</h4>
                      <ul className="space-y-2">
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Computes item similarity using cosine similarity
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Builds item-item similarity matrix
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Handles scalability better than user-based approach
                        </li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Implementation</h4>
                      <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code>{`class ItemBasedCFRecommender extends CollaborativeFilteringRecommender {
  async getRecommendations(userId: string): Promise<Recommendation[]> {
    const userRatings = await this.getUserRatings(userId);
    const itemSimilarities = await this.getItemSimilarities();
    const predictions = await this.generatePredictions(userId, itemSimilarities);
    return this.filterAndSortRecommendations(predictions);
  }
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">Pros and Cons</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div className="bg-emerald-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-emerald-600 mb-3">Advantages</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                          <span>Can discover unexpected but relevant items</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                          <span>Works well with implicit feedback</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                          <span>Adapts to user preferences over time</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-red-600 mb-3">Limitations</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2"></span>
                          <span>Suffers from cold start problem</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2"></span>
                          <span>Requires sufficient user interaction data</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2"></span>
                          <span>Can be affected by popularity bias</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="matrix" className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-3xl font-bold mb-4 text-emerald-600">Level 3: Matrix Factorization</h2>
              <p className="text-gray-700 leading-relaxed mb-6">Matrix factorization techniques decompose the user-item interaction matrix into latent factors:</p>
              
              <div className="space-y-8">
                <div className="bg-emerald-50 p-6 rounded-lg">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">1. Singular Value Decomposition (SVD)</h3>
                  <p className="text-gray-700 mb-4">SVD identifies latent factors that explain user preferences.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Key Features</h4>
                      <ul className="space-y-2">
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Decomposes rating matrix into user and item factors
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Captures hidden patterns in user preferences
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Handles missing data through factorization
                        </li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Implementation</h4>
                      <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code>{`class SVDRecommender extends MatrixFactorizationRecommender {
  async train(): Promise<void> {
    const {U, S, V} = this.svd(this.ratingMatrix);
    this.userFactors = U;
    this.itemFactors = V.transpose();
    this.singularValues = S;
  }

  async getRecommendations(userId: string): Promise<Recommendation[]> {
    const userFactors = this.getUserFactors(userId);
    const predictions = this.itemFactors.map(item => 
      this.predictRating(userFactors, item)
    );
    return this.filterAndSortRecommendations(predictions);
  }
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 p-6 rounded-lg">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">2. SVD with PCA</h3>
                  <p className="text-gray-700 mb-4">This enhanced version uses Principal Component Analysis for dimensionality reduction.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Key Features</h4>
                      <ul className="space-y-2">
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Reduces computational complexity
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Focuses on most important latent factors
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Improves recommendation quality
                        </li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Implementation</h4>
                      <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code>{`class SVDPCARecommender extends SVDRecommender {
  async train(): Promise<void> {
    await super.train();
    this.userFactors = this.pca(this.userFactors);
    this.itemFactors = this.pca(this.itemFactors);
  }
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">Pros and Cons</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="bg-emerald-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-emerald-600 mb-3">Advantages</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                          <span>Handles sparse data well</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                          <span>Captures complex user preferences</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                          <span>Scales to large datasets</span>
                        </li>
                      </ul>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-red-600 mb-3">Limitations</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2"></span>
                          <span>Computationally expensive to train</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2"></span>
                          <span>Difficult to explain recommendations</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2"></span>
                          <span>Requires careful hyperparameter tuning</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="hybrid" className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-3xl font-bold mb-4 text-emerald-600">Level 4: Hybrid Methods</h2>
              <p className="text-gray-700 leading-relaxed mb-6">Hybrid methods combine multiple recommendation techniques to leverage their strengths:</p>
              
              <div className="space-y-8">
                <div className="bg-emerald-50 p-6 rounded-lg">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">1. Weighted Hybrid</h3>
                  <p className="text-gray-700 mb-4">This approach combines recommendations from different algorithms with learned weights.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Key Features</h4>
                      <ul className="space-y-2">
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Dynamically adjusts weights based on performance
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Combines content-based and collaborative results
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Balances between different recommendation strategies
                        </li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Implementation</h4>
                      <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code>{`class WeightedHybridRecommender extends HybridRecommender {
  async getRecommendations(userId: string): Promise<Recommendation[]> {
    const contentRecs = await this.contentRecommender.getRecommendations(userId);
    const collabRecs = await this.collabRecommender.getRecommendations(userId);
    const matrixRecs = await this.matrixRecommender.getRecommendations(userId);
    
    const weightedRecs = this.combineRecommendations(
      contentRecs,
      collabRecs,
      matrixRecs,
      this.weights
    );
    
    return this.filterAndSortRecommendations(weightedRecs);
  }
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 p-6 rounded-lg">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">2. Switching Hybrid</h3>
                  <p className="text-gray-700 mb-4">This method dynamically chooses the best algorithm based on context.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Key Features</h4>
                      <ul className="space-y-2">
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Evaluates algorithm performance in real-time
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Switches between algorithms based on conditions
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Handles different user scenarios effectively
                        </li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Implementation</h4>
                      <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code>{`class SwitchingHybridRecommender extends HybridRecommender {
  async getRecommendations(userId: string): Promise<Recommendation[]> {
    const context = await this.analyzeUserContext(userId);
    const bestAlgorithm = this.selectBestAlgorithm(context);
    
    switch (bestAlgorithm) {
      case 'content':
        return this.contentRecommender.getRecommendations(userId);
      case 'collaborative':
        return this.collabRecommender.getRecommendations(userId);
      case 'matrix':
        return this.matrixRecommender.getRecommendations(userId);
      default:
        return this.getFallbackRecommendations(userId);
    }
  }
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">Pros and Cons</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-emerald-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-emerald-600 mb-3">Advantages</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                          <span>Combines strengths of different approaches</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                          <span>More robust to different scenarios</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                          <span>Can adapt to changing user behavior</span>
                        </li>
                      </ul>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-red-600 mb-3">Limitations</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2"></span>
                          <span>Increased system complexity</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2"></span>
                          <span>Higher computational requirements</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2"></span>
                          <span>More difficult to maintain</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="clustering" className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-3xl font-bold mb-4 text-emerald-600">Level 5: Clustering</h2>
              <p className="text-gray-700 leading-relaxed mb-6">Clustering methods group similar items or users to enhance recommendations:</p>
              
              <div className="space-y-8">
                <div className="bg-emerald-50 p-6 rounded-lg">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">1. K-means Clustering</h3>
                  <p className="text-gray-700 mb-4">This approach groups restaurants into clusters based on their features.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Key Features</h4>
                      <ul className="space-y-2">
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Identifies natural groupings in the data
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Optimizes cluster sizes for better accuracy
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Handles high-dimensional feature spaces
                        </li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Implementation</h4>
                      <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code>{`class KMeansRecommender extends ClusteringRecommender {
  async train(): Promise<void> {
    const features = await this.extractFeatures();
    this.clusters = this.kmeans(features, this.k);
    this.clusterCenters = this.computeClusterCenters();
  }

  async getRecommendations(userId: string): Promise<Recommendation[]> {
    const userCluster = this.findUserCluster(userId);
    const clusterItems = this.getClusterItems(userCluster);
    return this.filterAndSortRecommendations(clusterItems);
  }
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 p-6 rounded-lg">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">2. Cluster-Based Recommendations</h3>
                  <p className="text-gray-700 mb-4">This method uses cluster information to enhance recommendations.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Key Features</h4>
                      <ul className="space-y-2">
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Recommends items from the same cluster
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Considers cluster quality metrics
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          Handles cold start through cluster membership
                        </li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-emerald-600 mb-2">Implementation</h4>
                      <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code>{`class ClusterBasedRecommender extends KMeansRecommender {
  async getRecommendations(userId: string): Promise<Recommendation[]> {
    const userCluster = this.findUserCluster(userId);
    const similarClusters = this.findSimilarClusters(userCluster);
    const recommendations = this.combineClusterRecommendations(
      userCluster,
      similarClusters
    );
    return this.filterAndSortRecommendations(recommendations);
  }
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">Pros and Cons</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-emerald-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-emerald-600 mb-3">Advantages</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                          <span>Efficient for large datasets</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                          <span>Provides natural grouping of items</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                          <span>Handles cold start well</span>
                        </li>
                      </ul>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-red-600 mb-3">Limitations</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2"></span>
                          <span>Sensitive to initial conditions</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2"></span>
                          <span>Requires careful parameter selection</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2"></span>
                          <span>May create artificial boundaries</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="conclusion" className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-3xl font-bold mb-4 text-emerald-600">Conclusion</h2>
              <p className="text-gray-700 leading-relaxed mb-6">Our multi-level recommendation system provides a robust framework for restaurant discovery, balancing various techniques to deliver personalized experiences.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-emerald-50 p-6 rounded-lg">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">System Architecture</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                      <span>Flexible combination of different recommendation strategies</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                      <span>Adaptation to different user scenarios and data availability</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                      <span>Scalable processing of large datasets</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                      <span>Continuous improvement through feedback and evaluation</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-emerald-50 p-6 rounded-lg">
                  <h3 className="text-2xl font-semibold text-emerald-700 mb-4">Future Work</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                      <span>Enhancing scalability through distributed processing</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                      <span>Integrating real-time data processing</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                      <span>Improving explanation capabilities</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                      <span>Developing more sophisticated hybrid approaches</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-2"></span>
                      <span>Enhancing personalization through deeper user modeling</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function loadUserData(): User[] {
  const csvPath = path.join(process.cwd(), 'data', 'processed', 'user_processed.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  return parse(fileContent, { columns: true, skip_empty_lines: true });
}

function loadRatingsData(): Rating[] {
  const csvPath = path.join(process.cwd(), 'data', 'processed', 'ratings_processed.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  return parse(fileContent, { columns: true, skip_empty_lines: true });
}

function loadBusinessData(): Business[] {
  const csvPath = path.join(process.cwd(), 'data', 'processed', 'business_processed.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  return parse(fileContent, { columns: true, skip_empty_lines: true });
}

function loadReviewsData(): Review[] {
  const csvPath = path.join(process.cwd(), 'data', 'processed', 'reviews_processed.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  return parse(fileContent, { columns: true, skip_empty_lines: true });
}