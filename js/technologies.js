export function initTechnologies() {
  const techContainer = document.getElementById('technologies');
  if (!techContainer) return;

  // Inyectar estructura visual
  techContainer.innerHTML = `
    <div style="padding: 10px; background: #fff; border-radius: 4px; border: 1px solid #ddd;">
      <p style="margin-top: 0; color: #666; font-size: 0.9em;">
        Detecta tecnologías, frameworks y librerías utilizadas en la página actual.
      </p>
      
      <button id="detectTechBtn" class="action-btn" style="margin-bottom: 10px; background-color: #6f42c1;">Analizar Tecnologías</button>
      
      <div id="techStatus" style="font-size: 0.85em; color: #555; margin-bottom: 5px;">Listo para analizar</div>
      
      <div id="techResults" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; margin-top: 10px;">
        <!-- Resultados aquí -->
      </div>
    </div>
  `;

  const detectBtn = document.getElementById('detectTechBtn');
  const statusDiv = document.getElementById('techStatus');
  const resultsDiv = document.getElementById('techResults');

  detectBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    detectBtn.disabled = true;
    statusDiv.textContent = 'Analizando DOM y variables globales...';
    resultsDiv.innerHTML = '';

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: runTechDetection
      });

      const detected = results[0].result;
      displayTechnologies(detected);
      
      if (detected.length === 0) {
        statusDiv.textContent = 'No se detectaron tecnologías conocidas.';
      } else {
        statusDiv.textContent = `Detectadas: ${detected.length} tecnologías.`;
      }

    } catch (err) {
      console.error(err);
      statusDiv.textContent = 'Error al analizar la página.';
    } finally {
      detectBtn.disabled = false;
    }
  });

  function displayTechnologies(technologies) {
    technologies.forEach(tech => {
      const card = document.createElement('div');
      card.className = 'tech-card';
      card.style.border = '1px solid #eee';
      card.style.borderRadius = '4px';
      card.style.padding = '8px';
      card.style.textAlign = 'center';
      card.style.background = '#f8f9fa';
      
      const icon = document.createElement('div');
      icon.textContent = getIconForTech(tech.name);
      icon.style.fontSize = '24px';
      icon.style.marginBottom = '4px';
      
      const name = document.createElement('div');
      name.textContent = tech.name;
      name.style.fontWeight = 'bold';
      name.style.fontSize = '0.9em';
      name.style.color = '#333';
      
      const type = document.createElement('div');
      type.textContent = tech.type;
      type.style.fontSize = '0.75em';
      type.style.color = '#666';
      
      card.appendChild(icon);
      card.appendChild(name);
      card.appendChild(type);
      resultsDiv.appendChild(card);
    });
  }

  function getIconForTech(name) {
    const icons = {
      'React': '⚛️', 'Vue.js': '🟢', 'Angular': '🅰️', 'jQuery': '💲', 
      'Bootstrap': '🅱️', 'WordPress': '📝', 'PHP': '🐘', 'Laravel': '🏗️',
      'Google Analytics': '📊', 'Font Awesome': '🚩', 'Shopify': '🛍️',
      'WooCommerce': '🛒', 'Elementor': '🎨', 'Yoast SEO': '🔍'
    };
    return icons[name] || '🔧';
  }
}

// Script inyectado en la página
function runTechDetection() {
  const detected = [];
  
  // Reglas de detección (Simplificadas)
  const rules = [
    // CMS
    { name: 'WordPress', type: 'CMS', check: () => window.wp || document.querySelector('meta[name="generator"][content*="WordPress"]') },
    { name: 'Joomla', type: 'CMS', check: () => document.querySelector('meta[name="generator"][content*="Joomla"]') },
    { name: 'Drupal', type: 'CMS', check: () => window.Drupal },
    { name: 'Shopify', type: 'Ecommerce', check: () => window.Shopify },
    { name: 'Wix', type: 'CMS', check: () => window.wixBiSession },
    { name: 'Squarespace', type: 'CMS', check: () => window.Static && window.Static.SQUARESPACE_CONTEXT },
    
    // JavaScript Frameworks
    { name: 'React', type: 'Framework', check: () => window.React || document.querySelector('[data-reactroot]') || window._REACT_DEVTOOLS_GLOBAL_HOOK_ },
    { name: 'Vue.js', type: 'Framework', check: () => window.Vue || document.querySelector('[data-v-app]') },
    { name: 'Angular', type: 'Framework', check: () => window.angular || document.querySelector('[ng-version]') },
    { name: 'Svelte', type: 'Framework', check: () => window.__svelte || document.querySelector('.svelte-') },
    { name: 'jQuery', type: 'Library', check: () => window.jQuery || window.$ },
    { name: 'Lodash', type: 'Library', check: () => window._ && window._.VERSION },
    
    // UI Frameworks
    { name: 'Bootstrap', type: 'UI', check: () => window.bootstrap || document.querySelector('link[href*="bootstrap"]') },
    { name: 'Tailwind CSS', type: 'UI', check: () => document.querySelector('.text-center') && (document.querySelector('[class*="tw-"]') || document.querySelector('[class*="text-"]')) }, // Heurística simple
    { name: 'Font Awesome', type: 'Font', check: () => document.querySelector('link[href*="font-awesome"]') || document.querySelector('link[href*="fontawesome"]') },
    
    // Analytics & Marketing
    { name: 'Google Analytics', type: 'Analytics', check: () => window.ga || window.gtag || document.cookie.includes('_ga=') },
    { name: 'Google Tag Manager', type: 'Analytics', check: () => window.google_tag_manager },
    { name: 'Facebook Pixel', type: 'Marketing', check: () => window.fbq },
    { name: 'Hotjar', type: 'Analytics', check: () => window.hj },
    
    // Server / Backend (Difícil de detectar desde cliente, solo por headers o pistas)
    { name: 'PHP', type: 'Language', check: () => document.querySelector('meta[name="generator"][content*="php"]') || document.cookie.includes('PHPSESSID') },
    { name: 'Laravel', type: 'Framework', check: () => document.cookie.includes('laravel_session') },
  ];

  rules.forEach(rule => {
    try {
      if (rule.check()) {
        detected.push({ name: rule.name, type: rule.type });
      }
    } catch (e) {}
  });

  return detected;
}
