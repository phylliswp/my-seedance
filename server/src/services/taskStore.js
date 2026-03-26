import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE_PATH = join(__dirname, '../../tasks.json');

let cache = loadFromFile();

function loadFromFile() {
  if (!existsSync(STORE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STORE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveToFile() {
  writeFileSync(STORE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
}

export function get(taskId) {
  return cache[taskId] || undefined;
}

export function set(taskId, info) {
  cache[taskId] = info;
  saveToFile();
}

export function remove(taskId) {
  delete cache[taskId];
  saveToFile();
}

export function entries() {
  return Object.entries(cache);
}
