// Log to confirm script runs
console.log('content.js loaded');

// Capture state every 3 sec
setInterval(() => {
  console.log('Checking for open loops...');
  const state = {};

  // GitHub PR draft
  const gh = document.querySelector('textarea[placeholder*="comment"], textarea[aria-label*="Comment"]');
  if (gh?.value?.trim()) {
    state.draft = gh.value;
    state.action = 'FINISH_PR';
    console.log('GitHub PR draft found:', state.draft);
  }

  // Gmail draft
  const gmail = document.querySelector('div[role="textbox"][contenteditable]');
  if (gmail?.innerText?.trim()) {
    state.draft = gmail.innerText;
    state.action = 'SEND_EMAIL';
    console.log('Gmail draft found:', state.draft);
  }

  // Video paused
  const video = document.querySelector('video');
  if (video && video.currentTime > 30 && video.paused) {
    state.videoTime = Math.floor(video.currentTime);
    state.action = 'RESUME_VIDEO';
    console.log('Paused video found:', state.videoTime);
  }

  // Half-read article
  if (window.scrollY > window.innerHeight * 1.5 && !video) {
    state.scroll = window.scrollY;
    state.articleText = document.body.innerText.slice(0, 10000);
    state.action = 'SUMMARIZE_ARTICLE';
    console.log('Article scroll detected:', state.scroll);
  }

  // Form draft
  const textarea = document.querySelector('textarea:not([placeholder*="comment"]):not([aria-label*="Comment"])');
  if (textarea?.value?.length > 30) {
    state.draft = textarea.value;
    state.action = 'SAVE_FORM';
    console.log('Form draft found:', state.draft);
  }

  if (Object.keys(state).length > 0) {
    console.log('Sending state:', state);
    chrome.runtime.sendMessage({ type: 'STATE', state });
  }
}, 3000);

// Respond to background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_STATE') {
    console.log('Background requested state');
    const state = {};
    const gh = document.querySelector('textarea[placeholder*="comment"], textarea[aria-label*="Comment"]');
    if (gh?.value?.trim()) state.draft = gh.value, state.action = 'FINISH_PR';
    
    const gmail = document.querySelector('div[role="textbox"][contenteditable]');
    if (gmail?.innerText?.trim()) state.draft = gmail.innerText, state.action = 'SEND_EMAIL';
    
    const video = document.querySelector('video');
    if (video && video.currentTime > 30 && video.paused) {
      state.videoTime = Math.floor(video.currentTime);
      state.action = 'RESUME_VIDEO';
    }
    
    if (window.scrollY > window.innerHeight * 1.5 && !video) {
      state.scroll = window.scrollY;
      state.articleText = document.body.innerText.slice(0, 10000);
      state.action = 'SUMMARIZE_ARTICLE';
    }
    
    const textarea = document.querySelector('textarea:not([placeholder*="comment"]):not([aria-label*="Comment"])');
    if (textarea?.value?.length > 30) state.draft = textarea.value, state.action = 'SAVE_FORM';
    
    console.log('Sending state to background:', state);
    sendResponse(state);
  }
});