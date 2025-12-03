import { getLocalStorage, getSyncStorage, setSyncStorage } from './storage.js';

export function initScanner() {
  const scannerContainer = document.getElementById('scanner');
  if (!scannerContainer) return;

  // Inyectar estructura visual
  scannerContainer.innerHTML = `
    <div style="margin-bottom: 10px; background: #fff; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      <div style="margin-bottom: 8px; font-size: 0.9em; color: #333;">Modo de Escaneo:</div>
      <div style="display: flex; gap: 15px;">
        <label style="cursor: pointer; display: flex; align-items: center;">
          <input type="radio" name="scannerMode" value="dir" checked style="margin-right: 5px;"> Directorios
        </label>
        <label style="cursor: pointer; display: flex; align-items: center;">
          <input type="radio" name="scannerMode" value="sub" style="margin-right: 5px;"> Subdominios
        </label>
      </div>
    </div>

    <div id="urlInputContainer" style="margin-bottom: 10px;">
      <label style="font-size: 0.8em; color: #666; display: block; margin-bottom: 4px;">
        Ruta (Base: <span id="baseUrlDisplay" style="color: #007bff;"></span>):
      </label>
      <input type="text" id="urlInput" placeholder="/FUZZ" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-family: monospace;">
    </div>
    
    <div style="display: flex; gap: 10px;">
      <button id="startBtn" class="action-btn">Iniciar Fuzzing</button>
      <button id="stopBtn" class="action-btn" style="background-color: #dc3545; display: none;">Detener</button>
    </div>
    
    <div id="stats-container" style="display: none; margin-top: 10px; font-size: 0.8em; color: #555; background: #e9ecef; padding: 8px; border-radius: 4px;">
      <div style="display: flex; justify-content: space-between;">
        <span>Progreso: <b id="progressVal">0/0</b></span>
        <span>Tiempo: <b id="timeVal">0s</b></span>
      </div>
      <div style="margin-top: 4px;">Velocidad: <b id="speedVal">0</b> req/s</div>
    </div>

    <div id="status">Listo para escanear</div>
    
    <ul id="results"></ul>
  `;

  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDiv = document.getElementById('status');
  const resultsList = document.getElementById('results');
  const urlInput = document.getElementById('urlInput');
  const urlInputContainer = document.getElementById('urlInputContainer');
  const baseUrlDisplay = document.getElementById('baseUrlDisplay');
  const statsContainer = document.getElementById('stats-container');
  const progressVal = document.getElementById('progressVal');
  const timeVal = document.getElementById('timeVal');
  const speedVal = document.getElementById('speedVal');
  const modeRadios = document.querySelectorAll('input[name="scannerMode"]');

  let currentTab = null;

  // Inicialización
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    currentTab = tabs[0];
    if (currentTab) {
      const url = new URL(currentTab.url);
      if (baseUrlDisplay) baseUrlDisplay.textContent = url.origin;
      
      // Cargar modo guardado
      const { scanMode } = await getSyncStorage({ scanMode: 'dir' });
      
      modeRadios.forEach(radio => {
        radio.checked = radio.value === scanMode;
        radio.addEventListener('change', handleModeChange);
      });
      
      // Aplicar estado inicial de UI
      updateUIForMode(scanMode);

      // Comprobar estado del escaneo en background
      checkScanStatus();
    }
  });

  function handleModeChange(e) {
    const newMode = e.target.value;
    setSyncStorage({ scanMode: newMode });
    updateUIForMode(newMode);
  }

  function updateUIForMode(mode) {
    if (mode === 'sub') {
      urlInputContainer.style.display = 'none';
      urlInput.value = ''; // Limpiar input al cambiar a subdominios
    } else {
      urlInputContainer.style.display = 'block';
      urlInput.placeholder = "/FUZZ";
    }
  }

  function checkScanStatus() {
    chrome.runtime.sendMessage({ action: 'get_status', tabId: currentTab.id }, (response) => {
      if (response.status === 'running' || response.status === 'stopping') {
        restoreScanState(response);
        if (response.status === 'stopping') {
          stopBtn.disabled = true;
          statusDiv.textContent = 'Deteniendo...';
        }
      } else {
        // Si no está corriendo, cargar resultados guardados si existen
        loadSavedResults();
      }
    });
  }

  async function loadSavedResults() {
    const url = new URL(currentTab.url);
    const baseUrl = url.origin;
    
    const result = await getLocalStorage(['navfuzz_results']);
    const allResults = result.navfuzz_results || {};
    const saved = allResults[baseUrl];
    
    if (saved && saved.length > 0) {
      resultsList.innerHTML = '';
      saved.forEach(item => addResult(item.word, item.status, item.url, item.lines, item.words));
      statusDiv.textContent = `Resultados anteriores cargados: ${saved.length}`;
    } else {
      statusDiv.textContent = 'Listo para escanear';
    }
  }

  function restoreScanState(state) {
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    stopBtn.disabled = false;
    statsContainer.style.display = 'block';
    statusDiv.textContent = 'Escaneando (en segundo plano)...';
    
    // Restaurar resultados ya encontrados
    resultsList.innerHTML = '';
    state.results.forEach(item => addResult(item.word, item.status, item.url, item.lines, item.words));
    
    updateStatsUI(state.completed, state.total, state.startTime);
  }

  startBtn.addEventListener('click', async () => {
    if (!currentTab) return;
    
    const { scanMode } = await getSyncStorage({ scanMode: 'dir' });
    const url = new URL(currentTab.url);
    let inputPath = urlInput.value.trim();
    
    // Si está vacío, usar /FUZZ por defecto SOLO si no es modo subdominios
    if (!inputPath && scanMode !== 'sub') {
        inputPath = '/FUZZ';
    }
    
    // Asegurar que empieza por / si no es una URL completa y no está vacío
    if (inputPath && !inputPath.startsWith('/') && !inputPath.startsWith('http')) {
        inputPath = '/' + inputPath;
    }

    let fullUrl;
    if (inputPath.startsWith('http')) {
        fullUrl = inputPath;
    } else {
        fullUrl = url.origin + inputPath;
    }
    
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    stopBtn.disabled = false;
    resultsList.innerHTML = '';
    statusDiv.textContent = 'Iniciando escaneo...';
    statsContainer.style.display = 'block';
    
    // Enviar mensaje al background para iniciar
    chrome.runtime.sendMessage({ 
      action: 'start_scan', 
      url: fullUrl, 
      tabId: currentTab.id 
    });
  });

  stopBtn.addEventListener('click', () => {
    if (!currentTab) return;
    
    stopBtn.disabled = true;
    statusDiv.textContent = 'Deteniendo...';
    
    chrome.runtime.sendMessage({ 
      action: 'stop_scan', 
      tabId: currentTab.id 
    });
  });

  // Escuchar actualizaciones del background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'scan_update' && currentTab && message.tabId === currentTab.id) {
      
      if (message.type === 'found') {
        addResult(message.data.word, message.data.status, message.data.url, message.data.lines, message.data.words);
      } else if (message.type === 'progress') {
        updateStatsUI(message.completed, message.total, message.startTime);
      } else if (message.type === 'complete') {
        statusDiv.textContent = `Escaneo completo. Encontrados: ${message.results.length}`;
        resetUI();
      } else if (message.type === 'stopped') {
        statusDiv.textContent = `Escaneo detenido. Encontrados: ${message.results.length}`;
        resetUI();
      }
    }
  });

  function resetUI() {
    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    stopBtn.disabled = false;
  }

  function updateStatsUI(completed, total, startTime) {
    const now = Date.now();
    const elapsedSeconds = (now - startTime) / 1000;
    const speed = completed / (elapsedSeconds || 0.001);

    progressVal.textContent = `${completed}/${total}`;
    timeVal.textContent = `${elapsedSeconds.toFixed(2)}s`;
    speedVal.textContent = speed.toFixed(1);
  }

  function addResult(word, status, url, lines, words) {
    const li = document.createElement('li');
    
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    // Si empieza por http, es un subdominio completo, si no, es una ruta relativa
    link.textContent = word.startsWith('http') ? word : (word.startsWith('/') ? word : `/${word}`);
    // Limpiar visualización para subdominios
    if (word.includes('.')) {
       link.textContent = word;
    }
    
    link.className = 'found';
    
    const statusSpan = document.createElement('span');
    let infoText = `(${status})`;
    if (lines !== undefined && words !== undefined) {
        infoText += ` [L:${lines} W:${words}]`;
    }
    statusSpan.textContent = infoText;
    statusSpan.className = 'status-code';
    
    li.appendChild(link);
    li.appendChild(statusSpan);
    resultsList.appendChild(li);
  }
}
