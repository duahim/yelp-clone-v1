import { NextResponse } from 'next/server';
import { serverLog } from '@/lib/server/logger';
import { clearUserCache } from '@/lib/server/recommendation/utils/cache';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }
    
    serverLog(`User logout: ${userId}`, 'info');
    
    // Clear the recommendation cache for this user
    const cacheCleared = clearUserCache(userId);
    
    return NextResponse.json({
      success: true,
      message: 'Logout successful',
      cacheCleared
    });
  } catch (error) {
    serverLog(`Error during logout: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 