import { NextRequest, NextResponse } from 'next/server';
import { getUserLikedBusinessIds } from '@/lib/server/loadUserData';

// Proper type definition for params object
type RouteParams = {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    if (!params || !params.id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Explicitly convert to string to ensure it's serializable
    const userId = String(params.id);
    
    // Get the business IDs that this user has liked
    const businessIds = getUserLikedBusinessIds(userId);
    return NextResponse.json(businessIds);
  } catch (error) {
    console.error('Error loading user ratings:', error);
    return NextResponse.json({ error: 'Failed to load user ratings' }, { status: 500 });
  }
} 