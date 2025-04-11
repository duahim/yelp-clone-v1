import pandas as pd
import numpy as np
import os
from scipy.stats import pearsonr
from collections import defaultdict

# Define the analysis functions
def calculate_pearson_correlation(vec1, vec2):
    """Calculate Pearson correlation between two vectors."""
    if len(vec1) < 2:
        return 0  # Need at least 2 points for correlation
    
    try:
        # Check if both vectors have variance
        if np.std(vec1) == 0 or np.std(vec2) == 0:
            return 0  # No correlation if no variance
        
        corr, _ = pearsonr(vec1, vec2)
        return corr if not np.isnan(corr) else 0
    except:
        return 0  # Handle any calculation errors

def find_similar_users(target_user_id, ratings_df, min_common_ratings=1, top_n=10):
    """Find users similar to the target user using Pearson correlation."""
    # Get the target user's ratings
    target_user_ratings = ratings_df[ratings_df['user_id'] == target_user_id]
    target_user_items = set(target_user_ratings['business_id'].values)
    
    print(f"Target user has rated {len(target_user_items)} items")
    
    # Create a dictionary of user ratings
    user_ratings = defaultdict(dict)
    for _, row in ratings_df.iterrows():
        user_ratings[row['user_id']][row['business_id']] = float(row['rating'])
    
    # Find users who have rated common items
    similarity_scores = []
    overlap_counts = []
    
    for other_user_id, other_ratings in user_ratings.items():
        if other_user_id == target_user_id:
            continue
        
        # Find common items
        other_user_items = set(other_ratings.keys())
        common_items = target_user_items.intersection(other_user_items)
        
        if len(common_items) >= min_common_ratings:
            # Extract ratings for common items
            target_values = [user_ratings[target_user_id][item] for item in common_items]
            other_values = [other_ratings[item] for item in common_items]
            
            # Calculate similarity
            similarity = calculate_pearson_correlation(target_values, other_values)
            
            similarity_scores.append((other_user_id, similarity, len(common_items)))
            overlap_counts.append(len(common_items))
    
    # Sort by similarity (highest first)
    similarity_scores.sort(key=lambda x: x[1], reverse=True)
    
    print(f"Found {len(similarity_scores)} users with at least {min_common_ratings} common ratings")
    if overlap_counts:
        print(f"Average overlap: {sum(overlap_counts)/len(overlap_counts):.2f} items")
        print(f"Max overlap: {max(overlap_counts)} items")
    
    return similarity_scores[:top_n]

def find_similar_items(target_user_id, ratings_df, min_common_users=1, top_n=10):
    """Find items similar to those the target user has rated using item-based CF."""
    # Get the target user's ratings
    target_user_ratings = ratings_df[ratings_df['user_id'] == target_user_id]
    target_items = target_user_ratings['business_id'].values
    
    print(f"\nTarget user has rated {len(target_items)} items")
    
    # Create item-based dictionaries
    item_ratings = defaultdict(dict)
    for _, row in ratings_df.iterrows():
        item_ratings[row['business_id']][row['user_id']] = float(row['rating'])
    
    # Find similar items to those the user has rated
    similar_items = []
    
    for target_item in target_items:
        target_item_users = set(item_ratings[target_item].keys())
        
        for other_item, other_ratings in item_ratings.items():
            if other_item == target_item:
                continue
            
            # Find users who rated both items
            other_item_users = set(other_ratings.keys())
            common_users = target_item_users.intersection(other_item_users)
            
            if len(common_users) >= min_common_users:
                # Extract ratings for common users
                target_values = [item_ratings[target_item][user] for user in common_users]
                other_values = [other_ratings[user] for user in common_users]
                
                # Calculate similarity
                similarity = calculate_pearson_correlation(target_values, other_values)
                
                if similarity > 0:
                    similar_items.append((target_item, other_item, similarity, len(common_users)))
    
    # Sort by similarity (highest first)
    similar_items.sort(key=lambda x: x[2], reverse=True)
    
    print(f"Found {len(similar_items)} similar item pairs with positive similarity")
    
    return similar_items[:top_n]

# Main execution
def main():
    # Set path to your ratings file
    ratings_file = os.path.join('data', 'processed', 'ratings_processed.csv')
    
    # Check if file exists
    if not os.path.exists(ratings_file):
        print(f"Error: File {ratings_file} not found")
        return
    
    # Load ratings data
    print(f"Loading ratings from {ratings_file}...")

    try:
        # First check if the file has headers
        with open(ratings_file, 'r') as f:
            first_line = f.readline().strip()
            has_header = not first_line.replace(',', '').replace('.', '').isdigit()
        
        # Then load the CSV with the appropriate parameters
        if has_header:
            ratings_df = pd.read_csv(ratings_file)
        else:
            # If no header, specify column names
            ratings_df = pd.read_csv(ratings_file, header=None, 
                                   names=['business_id', 'user_id', 'rating'])
        
        # Print sample to verify format
        print("\nSample of the loaded data:")
        print(ratings_df.head())
        
        # Check if columns exist and if not, try to infer them
        if 'user_id' not in ratings_df.columns:
            # Try to detect which column might contain the user_id
            for col in ratings_df.columns:
                # Sample some values to check if they look like user IDs
                sample = ratings_df[col].iloc[0]
                if isinstance(sample, str) and len(sample) > 20:  # User IDs tend to be long strings
                    print(f"Column '{col}' might contain user IDs, renaming to 'user_id'")
                    ratings_df = ratings_df.rename(columns={col: 'user_id'})
                    break
                    
        # Check specifically for the target user
        target_user_id = 'y19XcMnE8xwmXCrC-bZrFA'
        if target_user_id in ratings_df['user_id'].values:
            user_ratings = ratings_df[ratings_df['user_id'] == target_user_id]
            print(f"Found {len(user_ratings)} ratings for target user")
            print(user_ratings.head())
        else:
            # Additional diagnostics
            print("Target user not found in exact match, checking for partial matches...")
            for user_id in ratings_df['user_id'].unique()[:100]:  # Check first 100 to avoid overwhelming output
                if isinstance(user_id, str) and target_user_id in user_id:
                    print(f"Potential match: {user_id}")
            
            print(f"Error: User {target_user_id} not found in the dataset")
            return
        
        print(f"Loaded {len(ratings_df)} ratings for {ratings_df['user_id'].nunique()} users and {ratings_df['business_id'].nunique()} items")
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return
    
    print(f"\n--- ANALYZING USER: {target_user_id} ---")
    print("\n1. USER-BASED COLLABORATIVE FILTERING")
    
    # Test with different minimum common ratings
    for min_common in [1, 2, 3, 5]:
        print(f"\nTesting with min_common_ratings = {min_common}")
        similar_users = find_similar_users(target_user_id, ratings_df, min_common_ratings=min_common)
        
        # Output top similar users
        if similar_users:
            print("\nTop similar users:")
            for i, (user_id, similarity, common_count) in enumerate(similar_users[:5], 1):
                print(f"{i}. User {user_id[:8]}... (similarity: {similarity:.4f}, common items: {common_count})")
        else:
            print("No similar users found with the current threshold")
    
    print("\n2. ITEM-BASED COLLABORATIVE FILTERING")
    
    # Find similar items
    similar_items = find_similar_items(target_user_id, ratings_df, min_common_users=1)
    
    # Output similar items
    if similar_items:
        print("\nTop similar item pairs:")
        for i, (item1, item2, similarity, common_count) in enumerate(similar_items[:5], 1):
            print(f"{i}. Items {item1[:8]}... and {item2[:8]}... (similarity: {similarity:.4f}, common users: {common_count})")
    else:
        print("No similar items found with the current threshold")
    
    # Additional statistics
    print("\n3. DATASET STATISTICS")
    print(f"Total users: {ratings_df['user_id'].nunique()}")
    print(f"Total items: {ratings_df['business_id'].nunique()}")
    print(f"Total ratings: {len(ratings_df)}")
    
    # Calculate sparsity
    total_possible_ratings = ratings_df['user_id'].nunique() * ratings_df['business_id'].nunique()
    sparsity = 1 - (len(ratings_df) / total_possible_ratings)
    print(f"Dataset sparsity: {sparsity:.6f} ({sparsity*100:.4f}%)")
    
    # Distribution of ratings per user
    user_rating_counts = ratings_df['user_id'].value_counts()
    print(f"Average ratings per user: {user_rating_counts.mean():.2f}")
    print(f"Median ratings per user: {user_rating_counts.median():.2f}")
    print(f"Min ratings per user: {user_rating_counts.min()}")
    print(f"Max ratings per user: {user_rating_counts.max()}")

if __name__ == "__main__":
    main()