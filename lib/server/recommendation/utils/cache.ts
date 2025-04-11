import * as fs from 'fs';
import * as path from 'path';
import { serverLog } from '@/lib/server/logger';

// Constants for cache management
const CACHE_BASE_DIR = path.join(process.cwd(), 'cache');
const RECOMMENDATIONS_CACHE_DIR = path.join(CACHE_BASE_DIR, 'recommendations');

// Initialize cache directories
export function initCacheDirectories() {
  const dirs = [CACHE_BASE_DIR, RECOMMENDATIONS_CACHE_DIR];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        serverLog(`Created cache directory: ${dir}`, 'info');
      } catch (error) {
        serverLog(`Error creating cache directory ${dir}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      }
    }
  }
}

// Clear cache for a specific user
export function clearUserCache(userId: string) {
  try {
    serverLog(`Clearing recommendation cache for user: ${userId}`, 'info');
    
    // Get all cache files for the user
    const files = fs.readdirSync(RECOMMENDATIONS_CACHE_DIR);
    const userCacheFiles = files.filter(f => f.startsWith(`${userId}_`));
    
    if (userCacheFiles.length === 0) {
      serverLog(`No cache files found for user: ${userId}`, 'info');
      return false;
    }
    
    // Delete each file
    for (const file of userCacheFiles) {
      const filePath = path.join(RECOMMENDATIONS_CACHE_DIR, file);
      fs.unlinkSync(filePath);
      serverLog(`Deleted cache file: ${filePath}`, 'info');
    }
    
    serverLog(`Successfully cleared ${userCacheFiles.length} cache files for user: ${userId}`, 'info');
    return true;
  } catch (error) {
    serverLog(`Error clearing cache for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    return false;
  }
}

// Get cache file path for a user and algorithm
export function getCacheFilePath(userId: string, algorithm: string): string {
  return path.join(RECOMMENDATIONS_CACHE_DIR, `${userId}_${algorithm}.json`);
}

// Check if cached recommendations exist and are valid
export function getCachedRecommendations(userId: string, algorithm: string) {
  const cacheFilePath = getCacheFilePath(userId, algorithm);
  
  if (fs.existsSync(cacheFilePath)) {
    try {
      serverLog(`Found cached recommendations for user ${userId} using ${algorithm} algorithm`, 'info');
      const cachedData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
      return cachedData;
    } catch (error) {
      serverLog(`Error reading cache file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
      return null;
    }
  }
  
  serverLog(`No cache found for user ${userId} using ${algorithm} algorithm`, 'info');
  return null;
}

// Save recommendations to cache
export function cacheRecommendations(userId: string, algorithm: string, data: any) {
  initCacheDirectories(); // Ensure directories exist
  const cacheFilePath = getCacheFilePath(userId, algorithm);
  
  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify({
      ...data,
      cachedAt: new Date().toISOString()
    }));
    serverLog(`Saved recommendations to cache for user ${userId} using ${algorithm} algorithm`, 'info');
    return true;
  } catch (error) {
    serverLog(`Error writing to cache file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    return false;
  }
} 