const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const LOGS_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const LOG_FILE = path.join(LOGS_DIR, 'content_serverside.log');

/**
 * Write a log message to the content_serverside.log file
 * @param {string} message - The message to log
 * @param {string} level - Log level (info, debug, error, warn)
 */
function serverLog(message, level = 'info') {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    // Append to log file
    fs.appendFileSync(LOG_FILE, logEntry);
    
    // Also log to console for development
    console.log(`[SERVER] ${logEntry.trim()}`);
  } catch (error) {
    console.error('Error writing to log file:', error);
  }
}

/**
 * Log a separation line to the log file to mark the beginning of a new session
 */
function logSessionStart() {
  // Add debugging logs
  console.log('DEBUG: logSessionStart function called');
  try {
    const logMessage = 'NEW RECOMMENDATION SESSION STARTED';
    const timestamp = new Date().toISOString();
    const logEntry = `\n--------------------------------------------------\n[${timestamp}] ${logMessage}\n--------------------------------------------------\n`;
    
    // Log to file
    fs.appendFileSync(LOG_FILE, logEntry);
    
    // Log to console with color
    console.log('\x1b[36m%s\x1b[0m', `--------------------------------------------------`);
    console.log('\x1b[36m%s\x1b[0m', `[${timestamp}] ${logMessage}`);
    console.log('\x1b[36m%s\x1b[0m', `--------------------------------------------------`);
    
    console.log('DEBUG: logSessionStart function completed successfully');
  } catch (error) {
    console.error('DEBUG: Error in logSessionStart function:', error);
  }
}

module.exports = {
  serverLog,
  logSessionStart
}; 