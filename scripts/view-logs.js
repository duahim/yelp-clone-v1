/**
 * Utility script to view the content_serverside.log file
 * 
 * Usage:
 *   node scripts/view-logs.js [filter]
 * 
 * Examples:
 *   node scripts/view-logs.js                   # Show all logs
 *   node scripts/view-logs.js error             # Show only error logs
 *   node scripts/view-logs.js "business_id"     # Show logs containing "business_id"
 */

const fs = require('fs');
const path = require('path');

// Define log file path
const LOG_FILE = path.join(process.cwd(), 'logs', 'content_serverside.log');

// Check if the log file exists
if (!fs.existsSync(LOG_FILE)) {
  console.error(`Log file not found: ${LOG_FILE}`);
  console.log('No logs have been generated yet. Run the recommendation system first.');
  process.exit(1);
}

// Read the log file
const logContent = fs.readFileSync(LOG_FILE, 'utf8');
const logLines = logContent.split('\n').filter(Boolean);

console.log(`Found ${logLines.length} log entries in ${LOG_FILE}`);

// Get filter from command line arguments
const filter = process.argv[2]?.toLowerCase();

// Filter logs if a filter is provided
let filteredLogs = logLines;
if (filter) {
  console.log(`Filtering logs for: "${filter}"`);
  filteredLogs = logLines.filter(line => 
    line.toLowerCase().includes(filter.toLowerCase())
  );
  console.log(`Found ${filteredLogs.length} matching log entries`);
}

// Display the logs
console.log('\n=== LOG CONTENT ===');
console.log('===================\n');

filteredLogs.forEach(line => {
  // Colorize based on log level
  if (line.includes('[ERROR]')) {
    console.log('\x1b[31m%s\x1b[0m', line); // Red
  } else if (line.includes('[WARN]')) {
    console.log('\x1b[33m%s\x1b[0m', line); // Yellow
  } else if (line.includes('[INFO]')) {
    console.log('\x1b[32m%s\x1b[0m', line); // Green
  } else if (line.includes('[DEBUG]')) {
    console.log('\x1b[36m%s\x1b[0m', line); // Cyan
  } else {
    console.log(line);
  }
});

console.log('\n==================='); 