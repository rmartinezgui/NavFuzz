let wordlist = [];

// Cargar wordlist al iniciar el service worker
fetch('common.txt')
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
  }
  return true;
});

async function startScan(baseUrl, tabId) {
  if (activeScans[tabId] && activeScans[tabId].status === 'running') return;

  activeScans[tabId] = {
    status: 'running',
    completed: 0,
    total: wordlist.length,
    results: [],
    startTime: Date.now()
  };

  const scanState = activeScans[tabId];

  const promises = wordlist.map(async (word) => {
    const targetUrl = `${baseUrl}/${word}`;
    try {
      const response = await fetch(targetUrl, { method: 'HEAD' });
      
      if (response.ok || response.status === 403) {
        const result = { word, status: response.status, url: targetUrl, timestamp: Date.now() };
        scanState.results.push(result);
        
        // Notificar al popup si está abierto
        chrome.runtime.sendMessage({
          action: 'scan_update',
          tabId: tabId,
          type: 'found',
          data: result
        }).catch(() => {}); // Ignorar error si popup cerrado
      }
    } catch (error) {
      // Error de red
    } finally {
      scanState.completed++;
      
      // Notificar progreso (opcional: hacer throttling para no saturar)
      chrome.runtime.sendMessage({
        action: 'scan_update',
        tabId: tabId,
        type: 'progress',
        completed: scanState.completed,
        total: scanState.total,
        startTime: scanState.startTime
      }).catch(() => {});
    }
  });

  await Promise.all(promises);
  
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
