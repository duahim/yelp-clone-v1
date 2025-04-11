import { NextResponse } from 'next/server';
import { loadRandomUsers } from '@/lib/server/loadUserData';

// This is a static list so we only need to generate it once
const randomUsers = loadRandomUsers(10);

export async function GET() {
  try {
    console.log('Loading random users for dropdown');
    const users = loadRandomUsers(10);
    console.log(`Returning ${users.length} users, first user:`, users.length > 0 ? JSON.stringify(users[0]) : 'None');
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error in users API route:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
} 