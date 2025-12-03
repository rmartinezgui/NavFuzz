export function initCrawler() {
  const crawlerContainer = document.getElementById('crawler');
  if (!crawlerContainer) return;

  // Inyectar estructura visual
  crawlerContainer.innerHTML = `
    <div style="padding: 10px; background: #fff; border-radius: 4px; border: 1px solid #ddd;">
      <p style="margin-top: 0; color: #666; font-size: 0.9em;">
        Escanea la página actual en busca de enlaces, formularios y recursos ocultos.
      </p>
      
      <button id="startCrawlerBtn" class="action-btn" style="margin-bottom: 10px;">Ejecutar Crawler</button>
      
      <div id="crawlerStatus" style="font-size: 0.85em; color: #555; margin-bottom: 5px;">Esperando...</div>
      
      <div style="max-height: 300px; overflow-y: auto; border: 1px solid #eee; border-radius: 4px;">
        <ul id="crawlerResults" style="list-style: none; padding: 0; margin: 0;"></ul>
      </div>
      
      <div style="margin-top: 10px; text-align: right;">
        <button id="copyCrawlerBtn" style="padding: 5px 10px; font-size: 0.8em; cursor: pointer; background: #6c757d; color: white; border: none; border-radius: 3px; display: none;">Copiar Resultados</button>
      </div>
    </div>
  `;

  const startBtn = document.getElementById('startCrawlerBtn');
  const statusDiv = document.getElementById('crawlerStatus');
  const resultsList = document.getElementById('crawlerResults');
  const copyBtn = document.getElementById('copyCrawlerBtn');

  startBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    startBtn.disabled = true;
    statusDiv.textContent = 'Inyectando script...';
    resultsList.innerHTML = '';
    copyBtn.style.display = 'none';

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: runCrawlerScript
      });

      const urls = results[0].result;
      displayResults(urls);
      statusDiv.textContent = `Completado. Encontrados: ${urls.length} enlaces únicos.`;
      
      if (urls.length > 0) {
        copyBtn.style.display = 'inline-block';
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(urls.join('\n'));
          copyBtn.textContent = 'Copiado!';
          setTimeout(() => copyBtn.textContent = 'Copiar Resultados', 2000);
        };
      }

    } catch (err) {
      console.error(err);
      statusDiv.textContent = 'Error: No se pudo ejecutar el script en esta página.';
    } finally {
      startBtn.disabled = false;
    }
  });

  function displayResults(urls) {
    urls.forEach(url => {
      const li = document.createElement('li');
      li.style.padding = '6px 10px';
      li.style.borderBottom = '1px solid #f0f0f0';
      li.style.fontSize = '0.85em';
      li.style.wordBreak = 'break-all';
      
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.textContent = url;
      a.style.color = '#007bff';
      a.style.textDecoration = 'none';
      
      li.appendChild(a);
      resultsList.appendChild(li);
    });
  }
}

// Esta función se serializa y se ejecuta en el contexto de la página web
function runCrawlerScript() {
  console.log('%c[NavFuzz Crawler] Starting page scan...', 'color: #007bff; font-weight: bold;');
  
  const links = new Set();
  const baseUrl = window.location.origin;

  function addUrl(urlStr, type) {
    try {
      if (!urlStr) return;
      const url = new URL(urlStr, window.location.href);
      
      if (url.protocol.startsWith('http')) {
        if (!links.has(url.href)) {
          links.add(url.href);
          // console.log(`[NavFuzz] Found [${type}]:`, url.pathname);
        }
      }
    } catch (e) {
      // Ignore invalid URLs
    }
  }

  // 1. Anchor tags
  const anchors = document.querySelectorAll('a[href]');
  anchors.forEach(a => addUrl(a.href, 'link'));

  // 2. Forms
  const forms = document.querySelectorAll('form[action]');
  forms.forEach(f => addUrl(f.action, 'form'));

  // 3. Resources
  const resources = document.querySelectorAll('script[src], img[src], link[href], iframe[src]');
  resources.forEach(el => {
    const type = el.tagName.toLowerCase();
    addUrl(el.src || el.href, type);
  });

  console.log(`%c[NavFuzz Crawler] Finished. Total unique URLs: ${links.size}`, 'color: #28a745; font-weight: bold;');
  return Array.from(links).sort();
}
