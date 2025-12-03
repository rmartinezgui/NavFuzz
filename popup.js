const startBtn = document.getElementById('startBtn');
const statusDiv = document.getElementById('status');
const resultsList = document.getElementById('results');
const targetDiv = document.getElementById('target');
const statsContainer = document.getElementById('stats-container');
const progressVal = document.getElementById('progressVal');
const timeVal = document.getElementById('timeVal');
const speedVal = document.getElementById('speedVal');

let wordlist = [];

// Cargar wordlist desde common.txt
fetch('common.txt')
  .then(response => response.text())
  .then(text => {
    wordlist = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));
    statusDiv.textContent = `Listo. Wordlist cargada: ${wordlist.length} entradas`;
  })
  .catch(err => {
    console.error('Error cargando wordlist:', err);
    statusDiv.textContent = 'Error: No se pudo cargar common.txt';
    // Fallback a una lista mínima si falla
    wordlist = ['admin', 'login', 'robots.txt'];
  });

let currentTab = null;

// Obtener la pestaña actual al cargar
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  currentTab = tabs[0];
  if (currentTab) {
    const url = new URL(currentTab.url);
    targetDiv.textContent = `Target: ${url.origin}`;
  }
});

startBtn.addEventListener('click', async () => {
  if (!currentTab) return;
  
  startBtn.disabled = true;
  resultsList.innerHTML = '';
  statusDiv.textContent = 'Escaneando...';
  statsContainer.style.display = 'block';
  
  const url = new URL(currentTab.url);
  const baseUrl = url.origin;

  let completed = 0;
  let foundCount = 0;
  const total = wordlist.length;
  const startTime = performance.now();

  // Función para actualizar estadísticas
  const updateStats = () => {
    const now = performance.now();
    const elapsedSeconds = (now - startTime) / 1000;
    const speed = completed / (elapsedSeconds || 0.001); // Evitar división por cero

    progressVal.textContent = `${completed}/${total}`;
    timeVal.textContent = `${elapsedSeconds.toFixed(2)}s`;
    speedVal.textContent = speed.toFixed(1);
  };

  // Lanzamos todas las peticiones en paralelo
  const promises = wordlist.map(async (word) => {
    const targetUrl = `${baseUrl}/${word}`;
    try {
      // Usamos fetch con método HEAD para ser más rápidos y ligeros
      const response = await fetch(targetUrl, { method: 'HEAD' });
      
      // Consideramos "encontrado" si el status es 200-299 o 403 (Forbidden)
      if (response.ok || response.status === 403) {
        addResult(word, response.status, targetUrl);
        foundCount++;
      }
    } catch (error) {
      console.log(`Error al acceder a ${targetUrl}:`, error);
      // Los errores de red (como bloqueos CORS estrictos) caerán aquí
    } finally {
      completed++;
      updateStats();
    }
  });

  // Esperamos a que todas terminen
  await Promise.all(promises);
  
  statusDiv.textContent = `Escaneo completo. Encontrados: ${foundCount}`;
  startBtn.disabled = false;
});

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
