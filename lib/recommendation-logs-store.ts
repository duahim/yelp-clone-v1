"use client"

// A simple store for recommendation logs
// This provides an alternative way to store and retrieve logs if the main approach has issues

// Define the log types
type LogType = 'contentBased' | 'collaborative' | 'matrix';

// Define the store
class LogStore {
  private logs: Record<LogType, string[]> = {
    contentBased: ['Initializing content-based recommendation logs...'],
    collaborative: ['Process logs not available for collaborative filtering'],
    matrix: ['Process logs not available for matrix factorization']
  };
  private userId: string = 'unknown';
  private isInitialized: boolean = false;

  constructor() {
    // Don't auto-initialize in constructor to avoid SSR issues
    // We'll initialize on first access instead
  }

  // Initialize the store - call this before first use
  initialize(): void {
    if (this.isInitialized) return;
    
    // Setup storage event listener to detect user changes
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageChange.bind(this));
    }
    
    this.updateCurrentUserId();
    this.loadLogs();
    this.isInitialized = true;
  }
  
  // Handle storage events (like user login/logout in other tabs)
  private handleStorageChange(event: StorageEvent): void {
    // If the currentUser localStorage item changed
    if (event.key === 'currentUser') {
      console.log('LogStore: Detected currentUser change in localStorage');
      
      if (event.newValue) {
        try {
          // A new user logged in
          const newUser = JSON.parse(event.newValue);
          const newUserId = newUser.user_id || 'unknown';
          
          if (this.userId !== newUserId) {
            console.log(`LogStore: User changed to ${newUserId} in another tab, resetting logs`);
            this.resetForUserChange(newUserId);
          }
        } catch (e) {
          console.error('Error parsing new user data:', e);
        }
      } else {
        // User logged out
        console.log('LogStore: User logged out in another tab');
        this.resetForUserChange('unknown');
      }
    }
  }

  // Force a reset when user changes
  resetForUserChange(newUserId: string): void {
    // Only reset if the user ID is actually different
    if (this.userId !== newUserId) {
      console.log(`LogStore: User changed from ${this.userId} to ${newUserId}, resetting logs`);
      this.userId = newUserId;
      
      // Reset logs to default
      this.logs = {
        contentBased: ['Initializing content-based recommendation logs...'],
        collaborative: ['Process logs not available for collaborative filtering'],
        matrix: ['Process logs not available for matrix factorization']
      };
      
      // Save the empty logs for the new user
      this.saveLogs();
    }
  }

  // Update the current user ID
  private updateCurrentUserId(): void {
    if (typeof window !== 'undefined') {
      try {
        const userString = localStorage.getItem("currentUser");
        if (userString) {
          const user = JSON.parse(userString);
          const newUserId = user.user_id || 'unknown';
          
          // If user changed, reset logs
          if (this.userId !== newUserId) {
            console.log(`LogStore: User changed from ${this.userId} to ${newUserId} in updateCurrentUserId`);
            // Clear logs when user changes
            this.logs = {
              contentBased: ['Initializing content-based recommendation logs...'],
              collaborative: ['Process logs not available for collaborative filtering'],
              matrix: ['Process logs not available for matrix factorization']
            };
            this.userId = newUserId;
          }
        }
      } catch (e) {
        console.error('Failed to parse user data:', e);
        this.userId = 'unknown';
      }
    }
  }

  // Load logs from localStorage
  private loadLogs(): void {
    if (typeof window !== 'undefined') {
      this.updateCurrentUserId(); // Ensure we have the latest user ID
      console.log(`LogStore: Loading logs for user ${this.userId}`);
      const savedLogs = localStorage.getItem(`recommendationLogs-${this.userId}`);
      if (savedLogs) {
        try {
          this.logs = JSON.parse(savedLogs);
          console.log(`LogStore: Loaded logs for user ${this.userId}:`, this.logs);
        } catch (e) {
          console.error('Failed to parse saved logs:', e);
        }
      } else {
        console.log(`LogStore: No saved logs found for user ${this.userId}`);
      }
    }
  }

  // Save the current logs to localStorage
  private saveLogs(): void {
    if (typeof window !== 'undefined') {
      console.log(`LogStore: Saving logs for user ${this.userId}`);
      localStorage.setItem(`recommendationLogs-${this.userId}`, JSON.stringify(this.logs));
    }
  }

  // Convert algorithm names to the correct key format
  private getLogKey(algorithm: string | LogType): LogType {
    if (algorithm === 'content-based') return 'contentBased';
    if (algorithm === 'contentBased') return 'contentBased';
    if (algorithm === 'collaborative') return 'collaborative';
    if (algorithm === 'matrix') return 'matrix';
    return 'contentBased'; // Default
  }

  // Set logs for a specific algorithm
  setLogs(type: string | LogType, newLogs: string[]): void {
    this.initialize();
    this.updateCurrentUserId(); // Ensure we have the latest user ID
    const key = this.getLogKey(type);
    this.logs[key] = newLogs;
    this.saveLogs();
  }

  // Add a log entry to a specific algorithm
  addLog(type: string | LogType, log: string): void {
    this.initialize();
    this.updateCurrentUserId(); // Ensure we have the latest user ID
    const key = this.getLogKey(type);
    this.logs[key].push(log);
    this.saveLogs();
  }

  // Get logs for a specific algorithm
  getLogs(type: string | LogType): string[] {
    this.initialize();
    this.updateCurrentUserId(); // Ensure we have the latest user ID
    // Reload logs to ensure we have the latest
    this.loadLogs();
    const key = this.getLogKey(type);
    return this.logs[key] || ['No logs available'];
  }

  // Clear logs for a specific algorithm
  clearLogs(type: string | LogType): void {
    this.initialize();
    this.updateCurrentUserId(); // Ensure we have the latest user ID
    const key = this.getLogKey(type);
    this.logs[key] = [];
    this.saveLogs();
  }
  
  // Debug: Get current user ID
  getCurrentUserId(): string {
    return this.userId;
  }
}

// Create a singleton instance
export const logStore = new LogStore(); 