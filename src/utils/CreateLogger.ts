import { colorConsole } from 'tracer';
import { stripAnsi } from './StripAnsi';
import fs from 'fs';
import path from 'path';

let logFile: string | undefined;
let isInitialized = false;
function initLogFile() {
  if (isInitialized) {
    return logFile;
  }
  isInitialized = true;
  const logDir = path.join(process.cwd(), 'logs');
  console.info(`Initializing log directory: ${logDir}`);
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    logFile = path.join(logDir, `log_${process.pid}_${new Date().toISOString().replace(/[:\-]/g, '.')}.log`);
  } catch {}
  return logFile;
}

export function createLogger() {
  return colorConsole({
    transport(data) {
      const logFile = initLogFile();
      if (logFile) {
        fs.appendFile(logFile, stripAnsi(data.rawoutput) + '\n', () => {});
      }
    },
  });
}
