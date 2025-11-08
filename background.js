// Log to confirm background is running
console.log('Background script loaded');

// Save tab state on focus/loss
chrome.tabs.onActivated.addListener(saveSnapshot);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    console.log('Tab updated:', tabId);
    saveSnapshot({ tabId });
  }
});

async function saveSnapshot(info) {
  try {
    const tab = await chrome.tabs.get(info.tabId);
    if (!tab.url?.startsWith('http')) return;

    chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' }, (state) => {
      if (chrome.runtime.lastError) {
        console.error('Send message error:', chrome.runtime.lastError);
        return;
      }
      if (state) {
        console.log('Saving state for tab:', tab.id, state);
        chrome.storage.local.set({
          [`tab_${tab.id}`]: { ...state, url: tab.url, title: tab.title, id: tab.id }
        });
      }
    });
  } catch (e) {
    console.error('saveSnapshot error:', e);
  }
}

// Auto-close empty group
chrome.tabs.onRemoved.addListener((tabId) => {
  console.log('Tab removed:', tabId);
  chrome.tabGroups.query({}, (groups) => {
    groups.forEach(async (group) => {
      const tabsInGroup = await chrome.tabs.query({ groupId: group.id });
      if (tabsInGroup.length === 0) {
        console.log('Closing empty group:', group.id);
        chrome.tabGroups.update(group.id, { collapsed: true });
      }
    });
  });
});