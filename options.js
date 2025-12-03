// Guardar opciones
document.getElementById('save').addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('.status-code');
  const allowedStatuses = [];
  
  checkboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      allowedStatuses.push(parseInt(checkbox.value));
    }
  });

  const excludeLinesStr = document.getElementById('excludeLines').value;
  const excludeWordsStr = document.getElementById('excludeWords').value;

  const excludeLines = excludeLinesStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
  const excludeWords = excludeWordsStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

  chrome.storage.sync.set({ allowedStatuses, excludeLines, excludeWords }, () => {
    const status = document.getElementById('status');
    status.style.opacity = '1';
    setTimeout(() => {
      status.style.opacity = '0';
    }, 2000);
  });
});

// Cargar opciones
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get({ 
    allowedStatuses: [200, 403],
    excludeLines: [],
    excludeWords: []
  }, (items) => {
    const checkboxes = document.querySelectorAll('.status-code');
    checkboxes.forEach((checkbox) => {
      if (items.allowedStatuses.includes(parseInt(checkbox.value))) {
        checkbox.checked = true;
      } else {
        checkbox.checked = false;
      }
    });

    document.getElementById('excludeLines').value = items.excludeLines.join(', ');
    document.getElementById('excludeWords').value = items.excludeWords.join(', ');
  });
});
