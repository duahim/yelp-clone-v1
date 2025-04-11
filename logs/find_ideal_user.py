import pandas as pd
import numpy as np
from collections import defaultdict, Counter

def find_ideal_cf_users(ratings_path, output_path, min_ratings=5, min_common=2, min_similarity=0.1):
    """
    Find users who are good candidates for collaborative filtering testing.
    
    Args:
        ratings_path: Path to CSV with ratings data (user_id, business_id, rating)
        output_path: Path to save the results
        min_ratings: Minimum number of ratings a user must have to be considered
        min_common: Minimum common ratings for similarity calculation
        min_similarity: Minimum similarity threshold to count a user as similar
    """
    print(f"Loading ratings from {ratings_path}...")
    ratings_df = pd.read_csv(ratings_path)
    
    # Basic statistics
    print(f"Dataset has {len(ratings_df)} ratings from {ratings_df['user_id'].nunique()} users for {ratings_df['business_id'].nunique()} businesses")
    
    # Filter users with enough ratings
    user_rating_counts = ratings_df['user_id'].value_counts()
    qualified_users = user_rating_counts[user_rating_counts >= min_ratings].index.tolist()
    print(f"Found {len(qualified_users)} users with at least {min_ratings} ratings")
    
    # For each qualified user, find how many others they'd have similarity with
    results = []
    
    for i, user_id in enumerate(qualified_users):
        if i % 10 == 0:
            print(f"Processing user {i}/{len(qualified_users)}")
            
        # Get this user's ratings
        user_ratings = ratings_df[ratings_df['user_id'] == user_id].set_index('business_id')['rating']
        
        # Statistics about potential similar users
        similar_user_count = 0
        potential_recommendations = set()
        
        # Check each other qualified user
        for other_id in qualified_users:
            if other_id == user_id:
                continue
                
            # Get other user's ratings
            other_ratings = ratings_df[ratings_df['user_id'] == other_id].set_index('business_id')['rating']
            
            # Find common items
            common_items = set(user_ratings.index) & set(other_ratings.index)
            
            if len(common_items) >= min_common:
                # Calculate pearson correlation
                common_user_ratings = [user_ratings[item] for item in common_items]
                common_other_ratings = [other_ratings[item] for item in common_items]
                
                # Simple pearson implementation
                similarity = calculate_pearson(common_user_ratings, common_other_ratings)
                
                if similarity > min_similarity:
                    similar_user_count += 1
                    
                    # Add businesses rated by similar user that target user hasn't rated
                    user_unrated = set(other_ratings.index) - set(user_ratings.index)
                    potential_recommendations.update(user_unrated)
        
        # Store results
        results.append({
            'user_id': user_id,
            'num_ratings': len(user_ratings),
            'similar_users': similar_user_count,
            'potential_recommendations': len(potential_recommendations)
        })
    
    # Convert to DataFrame and sort
    results_df = pd.DataFrame(results)
    results_df = results_df.sort_values(['similar_users', 'potential_recommendations'], ascending=False)
    
    # Save results
    results_df.to_csv(output_path, index=False)
    print(f"Results saved to {output_path}")
    
    # Print top 10 users
    print("\nTop 10 Users for CF Testing:")
    print(results_df.head(10))
    
    return results_df

def calculate_pearson(vecA, vecB):
    """Simple Pearson correlation implementation"""
    if len(vecA) < 2:
        return 0
        
    meanA = sum(vecA) / len(vecA)
    meanB = sum(vecB) / len(vecB)
    
    numerator = sum((a - meanA) * (b - meanB) for a, b in zip(vecA, vecB))
    denominatorA = sum((a - meanA) ** 2 for a in vecA)
    denominatorB = sum((b - meanB) ** 2 for b in vecB)
    
    # Prevent division by zero
    if denominatorA == 0 or denominatorB == 0:
        return 0
        
    return numerator / (np.sqrt(denominatorA) * np.sqrt(denominatorB))

if __name__ == "__main__":
    # Update these paths to match your environment
    ratings_path = "data/processed/ratings_processed.csv"
    output_path = "logs/ideal_cf_users.csv"
    
    # Find ideal users
    best_users = find_ideal_cf_users(
        ratings_path, 
        output_path,
        min_ratings=5,    # User needs at least 5 ratings
        min_common=1,     # Only need 1 common item with another user
        min_similarity=0.1 # Very low similarity threshold
    )