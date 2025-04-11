export function log(level: number, message: string) {
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Level ${level}] ${message}`);
  }
  
  // In production, send logs to the server
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ level, message }),
    }).catch(error => {
      console.error('Failed to send log to server:', error);
    });
  }
} 