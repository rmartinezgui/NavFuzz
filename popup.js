import { initTabs } from './js/tabs.js';
import { initOptions } from './js/options.js';
import { initScanner } from './js/scanner.js';
import { initCrawler } from './js/crawler.js';

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initOptions();
  initScanner();
  initCrawler();
});