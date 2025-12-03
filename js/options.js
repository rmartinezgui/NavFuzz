import { getSyncStorage, setSyncStorage, getSessionStorage, setSessionStorage, removeSessionStorage } from './storage.js';

export async function initOptions() {
  const optionsContainer = document.getElementById('options');
  if (!optionsContainer) return;

  // Inyectar estructura visual
  optionsContainer.innerHTML = `
    <div class="sub-tabs">
      <button class="sub-tab-btn active" data-subtab="opt-general">General</button>
      <button class="sub-tab-btn" data-subtab="opt-perf">Rendimiento</button>
      <button class="sub-tab-btn" data-subtab="opt-dict">Diccionario</button>
    </div>

    <!-- Sub-tab General -->
    <div id="opt-general" class="sub-tab-content active">
      <p style="margin-top: 0; color: #666; font-size: 0.9em;">Modo de Escaneo:</p>
      <div class="option-item">
        <label><input type="radio" name="scanMode" value="dir" checked> Directorios/Archivos</label>
      </div>
      <div class="option-item">
        <label><input type="radio" name="scanMode" value="sub"> Subdominios</label>
      </div>

      <p style="margin-top: 15px; color: #666; font-size: 0.9em;">Selecciona los códigos de estado a reportar:</p>
      
      <div class="option-item"><label><input type="checkbox" class="status-code" value="200"> 200 (OK)</label></div>
      <div class="option-item"><label><input type="checkbox" class="status-code" value="301"> 301 (Moved Permanently)</label></div>
      <div class="option-item"><label><input type="checkbox" class="status-code" value="302"> 302 (Found)</label></div>
      <div class="option-item"><label><input type="checkbox" class="status-code" value="401"> 401 (Unauthorized)</label></div>
      <div class="option-item"><label><input type="checkbox" class="status-code" value="403"> 403 (Forbidden)</label></div>
      <div class="option-item"><label><input type="checkbox" class="status-code" value="500"> 500 (Server Error)</label></div>

      <p style="margin-top: 15px; color: #666; font-size: 0.9em;">Filtros de Contenido (Excluir):</p>
      <div class="option-item" style="display: block;">
        <label style="margin-bottom: 5px; display: block;">Líneas (sep. por comas):</label>
        <input type="text" id="excludeLines" placeholder="Ej: 10, 25" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
      </div>
      <div class="option-item" style="display: block;">
        <label style="margin-bottom: 5px; display: block;">Palabras (sep. por comas):</label>
        <input type="text" id="excludeWords" placeholder="Ej: 50, 100" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
      </div>

      <p style="margin-top: 15px; color: #666; font-size: 0.9em;">Extensiones a probar:</p>
      <div class="option-item"><label><input type="checkbox" class="extension" value=""> (sin extensión)</label></div>
      <div class="option-item"><label><input type="checkbox" class="extension" value=".php"> .php</label></div>
      <div class="option-item"><label><input type="checkbox" class="extension" value=".html"> .html</label></div>
      <div class="option-item"><label><input type="checkbox" class="extension" value=".txt"> .txt</label></div>
      <div class="option-item"><label><input type="checkbox" class="extension" value=".json"> .json</label></div>
      <div class="option-item"><label><input type="checkbox" class="extension" value=".js"> .js</label></div>
      <div class="option-item"><label><input type="checkbox" class="extension" value=".bak"> .bak</label></div>
      <div class="option-item"><label><input type="checkbox" class="extension" value=".zip"> .zip</label></div>
    </div>

    <!-- Sub-tab Rendimiento -->
    <div id="opt-perf" class="sub-tab-content">
      <p style="margin-top: 0; color: #666; font-size: 0.9em;">Velocidad (Rate Limit):</p>
      <div class="option-item" style="display: block;">
        <label style="margin-bottom: 5px; display: block;">Concurrencia máxima (hilos):</label>
        <input type="number" id="concurrency" min="1" value="10" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
      </div>
    </div>

    <!-- Sub-tab Diccionario -->
    <div id="opt-dict" class="sub-tab-content">
      <p style="margin-top: 0; color: #666; font-size: 0.9em;">Diccionario:</p>
      <div class="option-item" style="display: block;">
        <label style="margin-bottom: 5px; display: block;">Cargar diccionario personalizado (.txt):</label>
        <input type="file" id="customDictFile" accept=".txt" style="width: 100%; margin-bottom: 5px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
          <span id="dictStatus" style="font-size: 0.85em; color: #666;">Uso: Default</span>
          <button id="resetDictBtn" style="padding: 4px 8px; font-size: 0.8em; cursor: pointer; background: #dc3545; color: white; border: none; border-radius: 3px; display: none;">Reset</button>
        </div>
      </div>
    </div>
  `;

  // Inicializar lógica de sub-tabs (ahora que existen en el DOM)
  const subTabBtns = optionsContainer.querySelectorAll('.sub-tab-btn');
  const subTabContents = optionsContainer.querySelectorAll('.sub-tab-content');

  subTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subTabBtns.forEach(b => b.classList.remove('active'));
      subTabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-subtab');
      document.getElementById(tabId).classList.add('active');
    });
  });

  const checkboxes = document.querySelectorAll('.status-code');
  const extCheckboxes = document.querySelectorAll('.extension');
  const concurrencyInput = document.getElementById('concurrency');
  const scanModeRadios = document.querySelectorAll('input[name="scanMode"]');
  const customDictFile = document.getElementById('customDictFile');
  const dictStatus = document.getElementById('dictStatus');
  const resetDictBtn = document.getElementById('resetDictBtn');
  const excludeLinesInput = document.getElementById('excludeLines');
  const excludeWordsInput = document.getElementById('excludeWords');

  // Cargar configuración inicial
  const items = await getSyncStorage({ 
    allowedStatuses: [200, 403], 
    allowedExtensions: [''],
    concurrency: 10,
    scanMode: 'dir',
    excludeLines: [],
    excludeWords: []
  });

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

  // Scan Mode
  scanModeRadios.forEach((radio) => {
    radio.checked = radio.value === items.scanMode;
    radio.addEventListener('change', saveOptions);
  });

  // Exclude Filters
  excludeLinesInput.value = items.excludeLines.join(', ');
  excludeLinesInput.addEventListener('change', saveOptions);
  
  excludeWordsInput.value = items.excludeWords.join(', ');
  excludeWordsInput.addEventListener('change', saveOptions);

  // Cargar estado del diccionario
  const sessionResult = await getSessionStorage(['customDictName']);
  if (sessionResult.customDictName) {
    dictStatus.textContent = `Uso: ${sessionResult.customDictName}`;
    resetDictBtn.style.display = 'inline-block';
  }

  // Listeners para diccionario personalizado
  customDictFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));

      if (lines.length === 0) {
        alert('El archivo está vacío o no contiene palabras válidas.');
        return;
      }

      await setSessionStorage({ 
        customWordlist: lines,
        customDictName: file.name + ` (${lines.length} palabras)`
      });
      
      dictStatus.textContent = `Uso: ${file.name} (${lines.length} palabras)`;
      resetDictBtn.style.display = 'inline-block';
      customDictFile.value = ''; // Reset input
      alert('Diccionario cargado correctamente (Sesión).');
    };
    reader.readAsText(file);
  });

  resetDictBtn.addEventListener('click', async () => {
    await removeSessionStorage(['customWordlist', 'customDictName']);
    dictStatus.textContent = 'Uso: Default';
    resetDictBtn.style.display = 'none';
  });

  function saveOptions() {
    const allowedStatuses = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => parseInt(cb.value));
      
    const allowedExtensions = Array.from(extCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);
    
    const concurrency = parseInt(concurrencyInput.value);
    
    const scanMode = Array.from(scanModeRadios).find(r => r.checked).value;

    const excludeLinesStr = excludeLinesInput.value;
    const excludeWordsStr = excludeWordsInput.value;

    const excludeLines = excludeLinesStr.split(/[,;\s]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    const excludeWords = excludeWordsStr.split(/[,;\s]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    
    setSyncStorage({ allowedStatuses, allowedExtensions, concurrency, scanMode, excludeLines, excludeWords });
  }
}
