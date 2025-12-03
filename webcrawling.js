(function() {
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
          console.log(`[NavFuzz] Found [${type}]:`, url.pathname);
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
})();
