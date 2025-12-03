let wordlist = [];

// Cargar wordlist al iniciar el service worker
const wordlistPromise = fetch('common.txt')
  .then(response => response.text())
  .then(text => {
    wordlist = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));
    console.log('Wordlist loaded:', wordlist.length);
  })
  .catch(err => {
    console.error('Error loading wordlist:', err);
    wordlist = ['admin', 'login', 'robots.txt']; // Fallback
  });

// Estado de los escaneos activos: tabId -> { status, completed, total, results, startTime }
let activeScans = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'start_scan') {
    startScan(request.url, request.tabId);
    sendResponse({ status: 'started' });
  } else if (request.action === 'get_status') {
    const scanState = activeScans[request.tabId];
    sendResponse(scanState || { status: 'idle' });
  } else if (request.action === 'start_crawl') {
    startCrawl(request.tabId);
    sendResponse({ status: 'crawling_started' });
  }
  return true;
});

async function startCrawl(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['webcrawling.js']
    });
    
    const links = results[0].result;
    console.log(`[NavFuzz Background] Crawl completed. ${links.length} links found.`);
    
    chrome.runtime.sendMessage({
      action: 'crawl_complete',
      results: links
    }).catch(() => {});
    
  } catch (err) {
    console.error('Crawl failed', err);
    chrome.runtime.sendMessage({
      action: 'crawl_error',
      error: err.message
    }).catch(() => {});
  }
}

async function startScan(baseUrl, tabId) {
  if (activeScans[tabId] && activeScans[tabId].status === 'running') return;

  // Esperar a que se cargue el wordlist
  await wordlistPromise;

  // Obtener configuración
  const { allowedStatuses, allowedExtensions, concurrency, scanMode } = await chrome.storage.sync.get({ 

    allowedStatuses: [200, 403],
    allowedExtensions: [''],
    concurrency: 10,
    scanMode: 'dir'
  });

  // Obtener wordlist (custom o default)
  const { customWordlist } = await chrome.storage.session.get(['customWordlist']);
  const currentWordlist = customWordlist || wordlist;

  // Generar lista de tareas
  const tasks = [];
  
  if (scanMode === 'sub') {
    // Modo Subdominios: word.domain.com
    const urlObj = new URL(baseUrl);
    let domain = urlObj.hostname;
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    
    for (const word of currentWordlist) {
      tasks.push({ word, type: 'sub', domain, protocol: urlObj.protocol });
    }
  } else {
    // Modo Directorios: domain.com/word.ext
    for (const word of currentWordlist) {
      for (const ext of allowedExtensions) {
        tasks.push({ word, ext, type: 'dir' });
      }
    }
  }

  activeScans[tabId] = {
    status: 'running',
    completed: 0,
    total: tasks.length,
    results: [],
    startTime: Date.now()
  };

  const scanState = activeScans[tabId];

  // Implementación de cola con concurrencia limitada
  let currentIndex = 0;
  const activePromises = [];

  const processNext = async () => {
    if (currentIndex >= tasks.length) return;

    const task = tasks[currentIndex++];
    let targetUrl;
    let displayWord;

    if (task.type === 'sub') {
      targetUrl = `${task.protocol}//${task.word}.${task.domain}`;
      displayWord = `${task.word}.${task.domain}`;
    } else {
      targetUrl = `${baseUrl}/${task.word}${task.ext}`;
      displayWord = `/${task.word}${task.ext}`;
    }

    try {
      const response = await fetch(targetUrl, { method: 'HEAD' });
      
      if (allowedStatuses.includes(response.status)) {
        const result = { word: displayWord, status: response.status, url: targetUrl, timestamp: Date.now() };
        scanState.results.push(result);
        
        chrome.runtime.sendMessage({
          action: 'scan_update',
          tabId: tabId,
          type: 'found',
          data: result
        }).catch(() => {});
      }
    } catch (error) {
      // Error de red (DNS error, timeout, etc)
      // console.debug(`Error fetching ${targetUrl}:`, error);
    } finally {
      scanState.completed++;
      
      chrome.runtime.sendMessage({
        action: 'scan_update',
        tabId: tabId,
        type: 'progress',
        completed: scanState.completed,
        total: scanState.total,
        startTime: scanState.startTime
      }).catch(() => {});
    }
  };

  // Bucle principal de ejecución
  while (currentIndex < tasks.length) {
    // Rellenar la cola hasta el límite de concurrencia
    while (activePromises.length < concurrency && currentIndex < tasks.length) {
      const promise = processNext().then(() => {
        // Eliminar promesa terminada de la lista
        activePromises.splice(activePromises.indexOf(promise), 1);
      });
      activePromises.push(promise);
    }
    
    // Esperar a que termine al menos una promesa antes de continuar
    if (activePromises.length > 0) {
      await Promise.race(activePromises);
    }
  }

  // Esperar a que terminen las últimas promesas
  await Promise.all(activePromises);
  
  scanState.status = 'complete';
  
  // Guardar en storage persistente
  if (scanState.results.length > 0) {
    chrome.storage.local.get(['navfuzz_results'], (result) => {
      const allResults = result.navfuzz_results || {};
      allResults[baseUrl] = scanState.results;
      chrome.storage.local.set({ navfuzz_results: allResults });
    });
  }

  chrome.runtime.sendMessage({
    action: 'scan_update',
    tabId: tabId,
    type: 'complete',
    results: scanState.results
  }).catch(() => {});
}
