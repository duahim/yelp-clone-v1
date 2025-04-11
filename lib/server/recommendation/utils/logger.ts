import fs from 'fs';
import path from 'path';

const logDirectory = path.join(__dirname, 'logs');

// Ensure the log directory exists
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

export function log(level: number, message: string) {
  const logFilePath = path.join(logDirectory, `level${level}_log.txt`);
  const logMessage = `${new Date().toISOString()} - ${message}\n`;
  
  fs.appendFileSync(logFilePath, logMessage, { encoding: 'utf8' });
}
