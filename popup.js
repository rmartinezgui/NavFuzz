const startBtn = document.getElementById('startBtn');
const statusDiv = document.getElementById('status');
const resultsList = document.getElementById('results');
const targetDiv = document.getElementById('target');
const statsContainer = document.getElementById('stats-container');
const progressVal = document.getElementById('progressVal');
const timeVal = document.getElementById('timeVal');
const speedVal = document.getElementById('speedVal');

let currentTab = null;

// Inicialización
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  currentTab = tabs[0];
  if (currentTab) {
    const url = new URL(currentTab.url);
    targetDiv.textContent = `Target: ${url.origin}`;
    
    // Comprobar estado del escaneo en background
    checkScanStatus();
  }
});

function checkScanStatus() {
  chrome.runtime.sendMessage({ action: 'get_status', tabId: currentTab.id }, (response) => {
    if (response.status === 'running') {
      restoreScanState(response);
    } else {
      // Si no está corriendo, cargar resultados guardados si existen
      loadSavedResults();
    }
  });
}

function loadSavedResults() {
  const url = new URL(currentTab.url);
  const baseUrl = url.origin;
  
  chrome.storage.local.get(['navfuzz_results'], (result) => {
    const allResults = result.navfuzz_results || {};
    const saved = allResults[baseUrl];
    
    if (saved && saved.length > 0) {
      resultsList.innerHTML = '';
      saved.forEach(item => addResult(item.word, item.status, item.url));
      statusDiv.textContent = `Resultados anteriores cargados: ${saved.length}`;
    } else {
      statusDiv.textContent = 'Listo para escanear';
    }
  });
}

function restoreScanState(state) {
  startBtn.disabled = true;
  statsContainer.style.display = 'block';
  statusDiv.textContent = 'Escaneando (en segundo plano)...';
  
  // Restaurar resultados ya encontrados
  resultsList.innerHTML = '';
  state.results.forEach(item => addResult(item.word, item.status, item.url));
  
  updateStatsUI(state.completed, state.total, state.startTime);
}

startBtn.addEventListener('click', () => {
  if (!currentTab) return;
  
  const url = new URL(currentTab.url);
  
  startBtn.disabled = true;
  resultsList.innerHTML = '';
  statusDiv.textContent = 'Iniciando escaneo...';
  statsContainer.style.display = 'block';
  
  // Enviar mensaje al background para iniciar
  chrome.runtime.sendMessage({ 
    action: 'start_scan', 
    url: url.origin, 
    tabId: currentTab.id 
  });
});

// Escuchar actualizaciones del background
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'scan_update' && currentTab && message.tabId === currentTab.id) {
    
    if (message.type === 'found') {
      addResult(message.data.word, message.data.status, message.data.url);
    } else if (message.type === 'progress') {
      updateStatsUI(message.completed, message.total, message.startTime);
    } else if (message.type === 'complete') {
      statusDiv.textContent = `Escaneo completo. Encontrados: ${message.results.length}`;
      startBtn.disabled = false;
    }
  }
});

function updateStatsUI(completed, total, startTime) {
  const now = Date.now();
  const elapsedSeconds = (now - startTime) / 1000;
  const speed = completed / (elapsedSeconds || 0.001);

  progressVal.textContent = `${completed}/${total}`;
  timeVal.textContent = `${elapsedSeconds.toFixed(2)}s`;
  speedVal.textContent = speed.toFixed(1);
}

function addResult(word, status, url) {
  const li = document.createElement('li');
  
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.textContent = `/${word}`;
  link.className = 'found';
  
  const statusSpan = document.createElement('span');
  statusSpan.textContent = `(${status})`;
  statusSpan.className = 'status-code';
  
  li.appendChild(link);
  li.appendChild(statusSpan);
  resultsList.appendChild(li);
}
