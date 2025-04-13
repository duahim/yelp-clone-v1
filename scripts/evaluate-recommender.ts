/**
 * Example script to demonstrate the evaluation of a recommender system
 * 
 * This script:
 * 1. Creates a TfIdfRecommender
 * 2. Loads test data
 * 3. Generates recommendations for a test user
 * 4. Evaluates the recommendations using precision, recall, and NDCG
 */

import { getRestuarantsFromDb, getReviewsFromDb } from '../lib/server/db-utils';
import { TfIdfRecommender } from '../lib/server/recommendation/level1_content/tf-idf';
import { evaluateRecommendations } from '../lib/server/recommendation/utils/evaluation';
import { Restaurant, Review } from '../lib/server/recommendation/types';

async function main() {
  try {
    console.log('Loading data...');
    const restaurants = await getRestuarantsFromDb();
    const reviews = await getReviewsFromDb();

    if (!restaurants || !reviews) {
      console.error('Failed to load data');
      return;
    }

    console.log(`Loaded ${restaurants.length} restaurants and ${reviews.length} reviews`);

    // Group reviews by user
    const reviewsByUser = new Map<string, Review[]>();
    reviews.forEach((review: Review) => {
      const userReviews = reviewsByUser.get(review.user_id) || [];
      userReviews.push(review);
      reviewsByUser.set(review.user_id, userReviews);
    });

    // Find a user with a good number of reviews
    const users = Array.from(reviewsByUser.entries())
      .filter(([, userReviews]) => userReviews.length >= 10)
      .sort(([, a], [, b]) => b.length - a.length);

    if (users.length === 0) {
      console.error('No users found with sufficient reviews');
      return;
    }

    const [testUserId, userReviews] = users[0];
    console.log(`Selected test user ${testUserId} with ${userReviews.length} reviews`);

    // Split user reviews into training (80%) and test (20%) sets
    const trainingThreshold = Math.floor(userReviews.length * 0.8);
    const shuffledReviews = [...userReviews].sort(() => 0.5 - Math.random());
    
    const trainingReviews = shuffledReviews.slice(0, trainingThreshold);
    const testReviews = shuffledReviews.slice(trainingThreshold);
    
    // Create training ratings map
    const trainingRatings = new Map<string, number>();
    trainingReviews.forEach(review => {
      trainingRatings.set(review.business_id, review.rating);
    });
    
    // Create test set (ground truth) - consider restaurants with rating >= 4 as relevant
    const relevantItems = new Set<string>();
    testReviews
      .filter(review => review.rating >= 4)
      .forEach(review => {
        relevantItems.add(review.business_id);
      });
    
    if (relevantItems.size === 0) {
      console.error('No relevant items found in test set');
      return;
    }
    
    console.log(`Training set: ${trainingReviews.length} reviews`);
    console.log(`Test set: ${testReviews.length} reviews (${relevantItems.size} relevant items)`);

    // Initialize and build recommender
    console.log('Building recommender...');
    const recommender = new TfIdfRecommender();
    await recommender.buildItemProfiles(restaurants, reviews);
    
    // Generate recommendations
    console.log('Generating recommendations...');
    const maxK = 20;
    const recommendationResult = recommender.getRecommendations(testUserId, trainingRatings, maxK);
    
    console.log(`Generated ${recommendationResult.recommendations.length} recommendations`);
    
    // Evaluate recommendations at different k values
    console.log('Evaluating recommendations...');
    const kValues = [1, 3, 5, 10, 15, 20];
    const evaluationResults = evaluateRecommendations(
      recommendationResult.recommendations, 
      relevantItems,
      kValues
    );
    
    // Print evaluation results
    console.log('\nEvaluation Results:');
    console.log('------------------');
    
    console.log('\nPrecision@K:');
    evaluationResults.precision.forEach(({ k, value }) => {
      console.log(`  K=${k}: ${(value * 100).toFixed(2)}%`);
    });
    
    console.log('\nRecall@K:');
    evaluationResults.recall.forEach(({ k, value }) => {
      console.log(`  K=${k}: ${(value * 100).toFixed(2)}%`);
    });
    
    console.log('\nNDCG@K:');
    evaluationResults.ndcg.forEach(({ k, value }) => {
      console.log(`  K=${k}: ${(value * 100).toFixed(2)}%`);
    });
    
    console.log('\nTop Recommendations:');
    const topRecommendations = recommendationResult.recommendations.slice(0, 5);
    topRecommendations.forEach((businessId, index) => {
      const isRelevant = relevantItems.has(businessId);
      const relevantMark = isRelevant ? '✓' : '✗';
      const restaurant = restaurants.find((r: Restaurant) => r.business_id === businessId);
      console.log(`  ${index + 1}. ${restaurant?.name || businessId} ${relevantMark}`);
    });
    
  } catch (error) {
    console.error('Error in evaluation:', error);
  }
}

// Run the main function
main()
  .then(() => console.log('Evaluation complete'))
  .catch(error => console.error('Fatal error:', error)); 