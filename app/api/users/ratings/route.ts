import { NextRequest, NextResponse } from 'next/server';
import { getUserLikedBusinessIds } from '@/lib/server/loadUserData';

export async function GET(request: NextRequest) {
  try {
    // Get the userId from the query parameter
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required (use ?userId=xxx)' }, { status: 400 });
    }

    // Get the business ratings for this user
    const businessRatings = getUserLikedBusinessIds(userId);
    console.log(`Found ${businessRatings.length} liked business ratings for user ${userId}`);
    
    // Return the business ratings directly
    return NextResponse.json(businessRatings);
  } catch (error) {
    console.error('Error loading user ratings:', error);
    return NextResponse.json({ error: 'Failed to load user ratings' }, { status: 500 });
  }
} 