/**
 * Test script for content-based recommendations
 * 
 * This script directly calls the content-based recommendation system
 * with a specific business ID to test the recommendation process.
 */

const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { getContentBasedRecommendations } = require('../lib/server/contentBasedRecommendation');
const { serverLog, logSessionStart } = require('../lib/server/logger');

// Sample data provided in the test case
const TEST_USER_ID = '2QgLdznnVc0GB1D1Dj8FYA';
const TEST_BUSINESS_ID = 'hW0Ne_HTHEAgGF1rAdmR-g';

// Function to run the test
async function runRecommendationTest() {
  console.log('\n======================================================');
  console.log('CONTENT-BASED RECOMMENDATION TEST');
  console.log('======================================================');
  console.log(`Testing with user ID: ${TEST_USER_ID}`);
  console.log(`Testing with business ID: ${TEST_BUSINESS_ID}`);
  console.log('------------------------------------------------------');
  
  serverLog('Starting recommendation test script', 'info');
  
  try {
    // 1. Verify data files exist
    const DATA_DIR = path.join(process.cwd(), 'data', 'processed');
    
    // Check user data
    const userFilePath = path.join(DATA_DIR, 'user_processed.csv');
    if (fs.existsSync(userFilePath)) {
      console.log('✅ User data file found');
      const userData = parse(fs.readFileSync(userFilePath, 'utf8'), { 
        columns: true, 
        skip_empty_lines: true 
      });
      
      const user = userData.find(u => u.user_id === TEST_USER_ID);
      if (user) {
        console.log(`✅ Test user found: ${user.name} (${user.user_id}), ${user.review_count} reviews, ${user.average_stars} avg stars`);
        serverLog(`Test user details: ${JSON.stringify(user)}`, 'info');
      } else {
        console.log('❌ Test user not found in user data');
        serverLog(`Test user ${TEST_USER_ID} not found in user data`, 'error');
      }
    } else {
      console.log('❌ User data file not found');
      serverLog(`User data file not found at ${userFilePath}`, 'error');
    }
    
    // Check ratings data
    const ratingsFilePath = path.join(DATA_DIR, 'ratings_processed.csv');
    if (fs.existsSync(ratingsFilePath)) {
      console.log('✅ Ratings data file found');
      const ratingsData = parse(fs.readFileSync(ratingsFilePath, 'utf8'), { 
        columns: true, 
        skip_empty_lines: true 
      });
      
      const userRatings = ratingsData.filter(r => r.user_id === TEST_USER_ID);
      if (userRatings.length > 0) {
        console.log(`✅ User has ${userRatings.length} ratings`);
        userRatings.forEach(rating => {
          console.log(`   - Business ID: ${rating.business_id}, Rating: ${rating.rating}`);
        });
        serverLog(`User ratings: ${JSON.stringify(userRatings)}`, 'info');
      } else {
        console.log('❌ No ratings found for test user');
        serverLog(`No ratings found for user ${TEST_USER_ID}`, 'warn');
      }
      
      // Check if our test business ID is in the ratings
      const businessRating = userRatings.find(r => r.business_id === TEST_BUSINESS_ID);
      if (businessRating) {
        console.log(`✅ Test business found in user ratings: ${TEST_BUSINESS_ID}, Rating: ${businessRating.rating}`);
      } else {
        console.log('❌ Test business not found in user ratings');
      }
    } else {
      console.log('❌ Ratings data file not found');
      serverLog(`Ratings data file not found at ${ratingsFilePath}`, 'error');
    }
    
    // Check business data
    const businessFilePath = path.join(DATA_DIR, 'business_processed.csv');
    if (fs.existsSync(businessFilePath)) {
      console.log('✅ Business data file found');
      const businessData = parse(fs.readFileSync(businessFilePath, 'utf8'), { 
        columns: true, 
        skip_empty_lines: true 
      });
      
      const business = businessData.find(b => b.business_id === TEST_BUSINESS_ID);
      if (business) {
        console.log(`✅ Test business found: ${business.name} (${business.business_id})`);
        console.log(`   - Location: ${business.city}, ${business.state}`);
        console.log(`   - Stars: ${business.stars}, Reviews: ${business.review_count}`);
        
        // Parse categories
        let categories = [];
        try {
          if (business.categories_list) {
            if (business.categories_list.startsWith('[') && business.categories_list.endsWith(']')) {
              categories = JSON.parse(business.categories_list.replace(/'/g, '"'));
            } else {
              categories = business.categories_list.split(',').map(c => c.trim());
            }
          } else if (business.categories) {
            if (business.categories.startsWith('[') && business.categories.endsWith(']')) {
              categories = JSON.parse(business.categories.replace(/'/g, '"'));
            } else {
              categories = business.categories.split(',').map(c => c.trim());
            }
          }
        } catch (e) {
          console.error('Error parsing categories:', e);
          categories = [];
        }
        
        console.log(`   - Categories: ${categories.join(', ')}`);
        serverLog(`Test business details: ${JSON.stringify({
          ...business,
          categories: categories
        })}`, 'info');
      } else {
        console.log('❌ Test business not found in business data');
        serverLog(`Test business ${TEST_BUSINESS_ID} not found in business data`, 'error');
      }
    } else {
      console.log('❌ Business data file not found');
      serverLog(`Business data file not found at ${businessFilePath}`, 'error');
    }
    
    // 2. Run the recommendation algorithm
    console.log('\nRunning content-based recommendation algorithm...');
    console.log('------------------------------------------------------');
    
    const result = getContentBasedRecommendations([TEST_BUSINESS_ID]);
    
    console.log(`\nRecommendation Results: ${result.recommendations.length} recommendations found`);
    console.log('------------------------------------------------------');
    
    // 3. Print recommendations with business details
    if (result.recommendations.length > 0) {
      const businessData = parse(fs.readFileSync(businessFilePath, 'utf8'), { 
        columns: true, 
        skip_empty_lines: true 
      });
      
      console.log('\nTop recommendations:');
      result.recommendations.slice(0, 5).forEach((id, index) => {
        const business = businessData.find(b => b.business_id === id);
        if (business) {
          console.log(`${index + 1}. ${business.name} (${business.business_id})`);
          console.log(`   - Location: ${business.city}, ${business.state}`);
          console.log(`   - Stars: ${business.stars}, Reviews: ${business.review_count}`);
          
          // Parse categories
          let categories = [];
          try {
            if (business.categories_list) {
              if (business.categories_list.startsWith('[') && business.categories_list.endsWith(']')) {
                categories = JSON.parse(business.categories_list.replace(/'/g, '"'));
              } else {
                categories = business.categories_list.split(',').map(c => c.trim());
              }
            } else if (business.categories) {
              if (business.categories.startsWith('[') && business.categories.endsWith(']')) {
                categories = JSON.parse(business.categories.replace(/'/g, '"'));
              } else {
                categories = business.categories.split(',').map(c => c.trim());
              }
            }
          } catch (e) {
            categories = [];
          }
          
          console.log(`   - Categories: ${categories.join(', ')}`);
        } else {
          console.log(`${index + 1}. Unknown business (${id})`);
        }
      });
    } else {
      console.log('No recommendations found!');
    }
    
    console.log('\n4. Process logs:');
    console.log('------------------------------------------------------');
    result.logs.forEach(log => console.log(log));
    
    console.log('\n======================================================');
    console.log('TEST COMPLETED');
    console.log('======================================================');
    console.log('For detailed logs, check logs/content_serverside.log');
    
  } catch (error) {
    console.error('Error running test:', error);
    serverLog(`Test script error: ${error.message}`, 'error');
  }
}

// Run the test
runRecommendationTest().catch(console.error); 