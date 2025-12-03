export function getSyncStorage(defaults) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(defaults, (items) => {
      resolve(items);
    });
  });
}

export function setSyncStorage(items) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(items, () => {
      resolve();
    });
  });
}

export function getSessionStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.session.get(keys, (items) => {
      resolve(items);
    });
  });
}

export function setSessionStorage(items) {
  return new Promise((resolve) => {
    chrome.storage.session.set(items, () => {
      resolve();
    });
  });
}

export function removeSessionStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.session.remove(keys, () => {
      resolve();
    });
  });
}

export function getLocalStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (items) => {
      resolve(items);
    });
  });
}
