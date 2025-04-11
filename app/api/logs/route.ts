import { NextResponse } from 'next/server';
import { log as serverLog } from '@/lib/server/recommendation/utils/logger';

export async function POST(request: Request) {
  try {
    const { level, message } = await request.json();
    serverLog(level, message);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing log:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process log' },
      { status: 500 }
    );
  }
} 