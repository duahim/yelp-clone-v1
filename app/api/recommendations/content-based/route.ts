import { NextRequest, NextResponse } from 'next/server';
import { loadRestaurantsFromCsv } from '@/lib/server/loadRestaurantData';
const { getContentBasedRecommendations } = require('@/lib/server/contentBasedRecommendation');
const { serverLog, logSessionStart } = require('@/lib/server/logger');

/**
 * API route for getting content-based recommendations
 * GET /api/recommendations/content-based?businessIds=id1,id2,id3
 */
export async function GET(request: NextRequest) {
  try {
    serverLog('Content-based recommendation API endpoint called', 'info');
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const businessIdsParam = searchParams.get('businessIds');
    const userId = searchParams.get('userId'); // Optional userId for better logging
    
    serverLog(`API request params: businessIds=${businessIdsParam}, userId=${userId}`, 'debug');
    
    // Helper function to format log with timestamp
    const formatLog = (message: string) => {
      const now = new Date();
      const timestamp = now.toISOString().split('T')[1].slice(0, 8); // HH:MM:SS format
      return `[${timestamp}] ${message}`;
    };
    
    if (!businessIdsParam) {
      serverLog('Error: businessIds parameter is required', 'error');
      return NextResponse.json(
        { error: 'businessIds parameter is required', logs: [formatLog('Error: businessIds parameter is required')] }, 
        { status: 400 }
      );
    }
    
    // Parse comma-separated business IDs
    const businessIds = businessIdsParam.split(',');
    
    if (businessIds.length === 0) {
      serverLog('Error: No business IDs provided', 'error');
      return NextResponse.json(
        { error: 'No business IDs provided', logs: [formatLog('Error: No business IDs provided')] }, 
        { status: 400 }
      );
    }
    
    serverLog(`Getting content-based recommendations for user ${userId || 'unknown'} with ${businessIds.length} businesses: ${JSON.stringify(businessIds)}`, 'info');
    console.log(`Getting content-based recommendations for user ${userId || 'unknown'} with ${businessIds.length} businesses`);
    
    // Call the enhanced content-based recommendation function
    serverLog('Calling getContentBasedRecommendations function', 'info');
    const { recommendations: recommendedBusinessIds, logs } = getContentBasedRecommendations(businessIds);
    serverLog(`Received ${recommendedBusinessIds.length} recommendation IDs from recommendation engine`, 'info');
    
    // Add timestamps to logs
    const timestampedLogs = Array.isArray(logs) && logs.length > 0 
      ? logs.map(formatLog) 
      : [
          formatLog('API generated logs but they were empty - using default logs'),
          formatLog(`Processing ${businessIds.length} businesses for recommendations`),
          formatLog('Examining restaurant attributes and reviews'),
          formatLog('Completed recommendation process')
        ];
    
    serverLog(`Generated ${recommendedBusinessIds.length} recommendations with ${timestampedLogs.length} log entries`, 'info');
    
    // Load restaurant data to get full details for the recommendations
    serverLog('Loading restaurant data for recommendations', 'info');
    const allRestaurants = loadRestaurantsFromCsv();
    serverLog(`Loaded ${allRestaurants.length} restaurants for recommendation details`, 'debug');
    
    // Map recommendation IDs to full restaurant objects
    const recommendedRestaurants = recommendedBusinessIds
      .map((id: string) => {
        const restaurant = allRestaurants.find(r => r.id === id);
        if (restaurant) {
          // Add explanation about why this was recommended
          return {
            ...restaurant,
            recommendation_reason: "This restaurant was recommended based on our advanced content-based filtering system that analyzed review text, sentiment, and business attributes."
          };
        }
        return null;
      })
      .filter(Boolean);
    
    // Create a log with restaurant names
    if (recommendedRestaurants.length > 0) {
      const restaurantNames = recommendedRestaurants
        .map((r: any) => r.name)
        .join(', ');
      
      const logMessage = `Recommended restaurants: ${restaurantNames}`;
      timestampedLogs.push(formatLog(logMessage));
      serverLog(logMessage, 'info');
    }
    
    // Return both recommendations and logs
    serverLog('API response ready, returning recommendations to client', 'info');
    return NextResponse.json({
      recommendations: recommendedRestaurants,
      logs: timestampedLogs,
      user_id: userId || 'unknown',
      restaurant_count: businessIds.length
    });
  } catch (error) {
    console.error('Error in content-based recommendations API:', error);
    serverLog(`API error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    
    // Helper function to format log with timestamp
    const formatLog = (message: string) => {
      const now = new Date();
      const timestamp = now.toISOString().split('T')[1].slice(0, 8); // HH:MM:SS format
      return `[${timestamp}] ${message}`;
    };
    
    return NextResponse.json(
      { 
        error: 'Failed to generate recommendations',
        logs: [
          formatLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`),
          formatLog('Unable to complete the recommendation process')
        ]
      }, 
      { status: 500 }
    );
  }
} 