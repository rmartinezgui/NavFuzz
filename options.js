// Guardar opciones
document.getElementById('save').addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('.status-code');
  const allowedStatuses = [];
  
  checkboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      allowedStatuses.push(parseInt(checkbox.value));
    }
  });

  chrome.storage.sync.set({ allowedStatuses }, () => {
    const status = document.getElementById('status');
    status.style.opacity = '1';
    setTimeout(() => {
      status.style.opacity = '0';
    }, 2000);
  });
});

// Cargar opciones
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get({ allowedStatuses: [200, 403] }, (items) => {
    const checkboxes = document.querySelectorAll('.status-code');
    checkboxes.forEach((checkbox) => {
      if (items.allowedStatuses.includes(parseInt(checkbox.value))) {
        checkbox.checked = true;
      } else {
        checkbox.checked = false;
      }
    });
  });
});
