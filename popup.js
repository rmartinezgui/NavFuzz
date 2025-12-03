import { initTabs } from './js/tabs.js';
import { initOptions } from './js/options.js';
import { initScanner } from './js/scanner.js';

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initOptions();
  initScanner();
});