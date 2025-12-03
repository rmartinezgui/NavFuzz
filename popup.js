const startBtn = document.getElementById('startBtn');
const statusDiv = document.getElementById('status');
const resultsList = document.getElementById('results');
const targetDiv = document.getElementById('target');

// Lista de directorios comunes para buscar
const wordlist = [
  'admin', 'login', 'test', 'dev', 'backup', 'api', 'dashboard', 
  'user', 'images', 'static', 'assets', 'config', 'db', 'robots.txt', 
  'sitemap.xml', 'wp-admin', 'phpmyadmin', '.env', '.git', 'private'
];

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
  statusDiv.textContent = 'Iniciando escaneo...';
  
  const url = new URL(currentTab.url);
  const baseUrl = url.origin;

  let foundCount = 0;

  for (const word of wordlist) {
    const targetUrl = `${baseUrl}/${word}`;
    try {
      statusDiv.textContent = `Probando: /${word}`;
      
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
    }
  }
  
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
