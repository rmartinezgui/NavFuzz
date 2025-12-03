const startBtn = document.getElementById('startBtn');
const statusDiv = document.getElementById('status');
const resultsList = document.getElementById('results');
const targetDiv = document.getElementById('target');
const statsContainer = document.getElementById('stats-container');
const progressVal = document.getElementById('progressVal');
const timeVal = document.getElementById('timeVal');
const speedVal = document.getElementById('speedVal');

// Gestión de Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Quitar active de todos
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    // Activar el seleccionado
    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');
  });
});

// Gestión de Sub-Tabs en Opciones
const subTabBtns = document.querySelectorAll('.sub-tab-btn');
const subTabContents = document.querySelectorAll('.sub-tab-content');

subTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    subTabBtns.forEach(b => b.classList.remove('active'));
    subTabContents.forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    const tabId = btn.getAttribute('data-subtab');
    document.getElementById(tabId).classList.add('active');
  });
});

// Gestión de opciones de filtrado
const checkboxes = document.querySelectorAll('.status-code');
const extCheckboxes = document.querySelectorAll('.extension');
const concurrencyInput = document.getElementById('concurrency');
const customDictFile = document.getElementById('customDictFile');
const dictStatus = document.getElementById('dictStatus');
const resetDictBtn = document.getElementById('resetDictBtn');

// Cargar configuración inicial y añadir listeners
chrome.storage.sync.get({ 
  allowedStatuses: [200, 403], 
  allowedExtensions: [''],
  concurrency: 10 
}, (items) => {
  // Status Codes
  checkboxes.forEach((checkbox) => {
    checkbox.checked = items.allowedStatuses.includes(parseInt(checkbox.value));
    checkbox.addEventListener('change', saveOptions);
  });

  // Extensions
  extCheckboxes.forEach((checkbox) => {
    checkbox.checked = items.allowedExtensions.includes(checkbox.value);
    checkbox.addEventListener('change', saveOptions);
  });

  // Concurrency
  concurrencyInput.value = items.concurrency;
  concurrencyInput.addEventListener('change', saveOptions);
});

// Cargar estado del diccionario
chrome.storage.session.get(['customDictName'], (result) => {
  if (result.customDictName) {
    dictStatus.textContent = `Uso: ${result.customDictName}`;
    resetDictBtn.style.display = 'inline-block';
  }
});

// Listeners para diccionario personalizado
customDictFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result;
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));

    if (lines.length === 0) {
      alert('El archivo está vacío o no contiene palabras válidas.');
      return;
    }

    chrome.storage.session.set({ 
      customWordlist: lines,
      customDictName: file.name + ` (${lines.length} palabras)`
    }, () => {
      dictStatus.textContent = `Uso: ${file.name} (${lines.length} palabras)`;
      resetDictBtn.style.display = 'inline-block';
      customDictFile.value = ''; // Reset input
      alert('Diccionario cargado correctamente (Sesión).');
    });
  };
  reader.readAsText(file);
});

resetDictBtn.addEventListener('click', () => {
  chrome.storage.session.remove(['customWordlist', 'customDictName'], () => {
    dictStatus.textContent = 'Uso: Default';
    resetDictBtn.style.display = 'none';
  });
});

function saveOptions() {
  const allowedStatuses = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => parseInt(cb.value));
    
  const allowedExtensions = Array.from(extCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);
  
  const concurrency = parseInt(concurrencyInput.value);
  
  chrome.storage.sync.set({ allowedStatuses, allowedExtensions, concurrency });
}

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
