import chalk, { ChalkFunction } from 'chalk';
import { now } from '@perf-tools/performance';
import prettyMs from 'pretty-ms';
import { createLogger } from './CreateLogger';

const logger = createLogger();

const env = process.env;
const debugSettings = new Set(env['DEBUG'] ? env['DEBUG'].split(',') : []);

function hashString(value: string) {
  let hash = 0;
  if (!value.length) {
    return hash;
  }
  for (let i = 0; i < value.length; ++i) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return hash;
}

const frequency = 0.5;
const width = 100;
const offset = 155;
function rainbow(index: number): ChalkFunction {
  return chalk.rgb(
    Math.floor(Math.sin(frequency * index + 0) * width + offset),
    Math.floor(Math.sin(frequency * index + 2) * width + offset),
    Math.floor(Math.sin(frequency * index + 4) * width + offset)
  );
}

function hashColor(name: string): ChalkFunction {
  return rainbow(hashString(name));
}

let logFn = console.log.bind(console);

if (logger) {
  logFn = logger.log.bind(logger);
}

export function setLogFn(fn: typeof console.log) {
  logFn = fn;
}

let last: any = undefined;
export function debug(name: string): (message: string, ...args: any[]) => void;
export function debug(name: string, message: string, ...args: any[]): void;
export function debug(
  name: string,
  message?: string,
  ...args: any[]
): void | ((message: string, ...args: any[]) => void) {
  if (message === undefined) {
    return debug.bind(undefined, name);
  }
  let delta = '';
  const current = now();
  if (last) {
    delta = chalk.bold(chalk.cyanBright(prettyMs(current - last)));
  }
  last = current;
  if (debugSettings.has(name) || logger) {
    logFn(`${hashColor(name)(`[${name}]`)} ${message}`, ...args, delta);
  }
}
