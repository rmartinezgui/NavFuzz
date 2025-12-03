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
  let { allowedStatuses, allowedExtensions, concurrency } = await chrome.storage.sync.get({ 
    allowedStatuses: [200, 403],
    allowedExtensions: [''],
    concurrency: 10
  });

  // Obtener wordlist (custom o default)
  const { customWordlist } = await chrome.storage.session.get(['customWordlist']);
  const currentWordlist = customWordlist || wordlist;

  console.log(`[NavFuzz] Config: Extensions=${JSON.stringify(allowedExtensions)}, Wordlist=${currentWordlist.length}`);

  // Si no hay extensiones seleccionadas, forzar al menos la cadena vacía
  if (!allowedExtensions || allowedExtensions.length === 0) {
    console.log('[NavFuzz] No extensions selected. Defaulting to ""');
    allowedExtensions = [''];
  }

  // Generar lista de tareas (combinación de palabras y extensiones)
  const tasks = [];
  for (const word of currentWordlist) {
    for (const ext of allowedExtensions) {
      tasks.push({ word, ext });
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

    const { word, ext } = tasks[currentIndex++];
    const targetUrl = `${baseUrl}/${word}${ext}`;

    try {
      const response = await fetch(targetUrl, { method: 'HEAD' });
      
      if (allowedStatuses.includes(response.status)) {
        const result = { word: word + ext, status: response.status, url: targetUrl, timestamp: Date.now() };
        scanState.results.push(result);
        
        chrome.runtime.sendMessage({
          action: 'scan_update',
          tabId: tabId,
          type: 'found',
          data: result
        }).catch(() => {});
      }
    } catch (error) {
      // Error de red
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
