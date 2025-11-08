document.getElementById('organize').onclick = async () => {
    console.log('Button clicked!');
    organizeAndAssassinate();
  };
  
  async function waitForGemini() {
    console.log('Checking for Gemini Nano...');
    let attempts = 0;
    while (attempts < 30) {
      if (window.ai) {
        console.log('Gemini Nano found!');
        return window.ai;
      }
      await new Promise(r => setTimeout(r, 500));
      attempts++;
    }
    console.log('Gemini Nano not available after 15s');
    return null;
  }
  
  async function autoGroupTabs(tabIds, title, color = 'blue') {
    try {
      if (tabIds.length === 0) return;
      console.log('Grouping tabs:', tabIds, title);
      const groupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(groupId, { title, collapsed: true, color });
      console.log('Group created:', groupId);
      return groupId;
    } catch (e) {
      console.error('autoGroupTabs error:', e);
    }
  }
  
  async function organizeAndAssassinate() {
    console.log('Starting organizeAndAssassinate...');
    const button = document.getElementById('organize');
    button.textContent = 'Loading AI...';
    button.disabled = true;
  
    const tabs = await chrome.tabs.query({});
    if (tabs.length === 0) {
      console.log('No tabs open');
      alert('No tabs open.');
      button.textContent = 'Organize & Assassinate (1 click)';
      button.disabled = false;
      return;
    }
  
    const ai = await waitForGemini();
    let groups = [];
  
    if (ai) {
      console.log('Using Prompt API for grouping');
      const titles = tabs.map((t, i) => `${i}: ${t.title} (${new URL(t.url).hostname})`).join('\n');
      const prompt = `
        Group these tabs into 3-5 smart clusters by topic (e.g., "Backend", "Research").
        For each unfinished tab, suggest ONE nudge like "Finish PR", "Resume Video", "Send Email", "Review".
        Output JSON only.
  
        Tabs:
        ${titles}
  
        Format:
        {
          "groups": [
            {
              "name": "Backend",
              "color": "blue",
              "tabIndices": [0, 1],
              "nudges": { "0": "Finish PR", "1": "Resume Video" }
            }
          ]
        }
      `;
  
      try {
        const result = await ai.languageModel.prompt(prompt, { structured: true });
        groups = JSON.parse(result).groups;
        console.log('AI grouped tabs:', groups);
      } catch (e) {
        console.error('Prompt API failed:', e);
      }
    }
  
    // Fallback: Group by domain
    if (groups.length === 0) {
      console.log('Falling back to domain grouping');
      const domainGroups = {};
      tabs.forEach((t, i) => {
        const domain = new URL(t.url).hostname;
        if (!domainGroups[domain]) domainGroups[domain] = { name: domain, color: 'grey', tabIndices: [], nudges: {} };
        domainGroups[domain].tabIndices.push(i);
        domainGroups[domain].nudges[i] = 'Review';
      });
      groups = Object.values(domainGroups);
    }
  
    // Auto-group
    console.log('Creating tab groups...');
    for (const group of groups) {
      const tabIds = group.tabIndices.map(i => tabs[i].id);
      const groupId = await autoGroupTabs(tabIds, group.name, group.color);
      
      group.tabIndices.forEach(idx => {
        const tab = tabs[idx];
        const nudge = group.nudges[idx.toString()] || 'Review';
        chrome.storage.local.set({ 
          [`nudge_${tab.id}`]: { action: nudge, groupId, tabId: tab.id } 
        });
      });
    }
  
    button.textContent = 'Organize & Assassinate (1 click)';
    button.disabled = false;
    console.log('Building tree...');
    buildTree();
  }
  
  async function enhanceWithAI(text, type) {
    console.log('Enhancing with AI:', type);
    const ai = await waitForGemini();
    if (!ai) {
      console.log('No AI for enhancement');
      return text;
    }
  
    try {
      if (type === 'FINISH_PR' || type === 'SEND_EMAIL') {
        const result = await ai.rewriter.rewrite(text, {
          tone: 'professional',
          length: 'same'
        });
        console.log('Rewriter result:', result.text);
        return result.text;
      }
      if (type === 'SUMMARIZE_ARTICLE') {
        const result = await ai.summarizer.summarize(text, {
          format: 'bullet_points',
          length: 'short'
        });
        console.log('Summarizer result:', result.summary);
        return `Summary:\n${result.summary}`;
      }
    } catch (e) {
      console.error('AI enhance failed:', e);
    }
    return text;
  }
  
  async function buildTree() {
    console.log('Rendering tree...');
    const entries = await chrome.storage.local.get(null);
    const nudgeKeys = Object.keys(entries).filter(k => k.startsWith('nudge_'));
    const tabs = await chrome.tabs.query({});
  
    let html = '';
    if (nudgeKeys.length === 0) {
      html = '<i>No open loops detected.</i>';
      console.log('No nudges found');
    } else {
      const groups = {};
      nudgeKeys.forEach(k => {
        const n = entries[k];
        const tab = tabs.find(t => t.id === n.tabId);
        if (!tab) return;
        const groupName = n.groupId ? `Group ${n.groupId}` : 'Ungrouped';
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push({ tab, nudge: n.action });
      });
  
      for (const [name, items] of Object.entries(groups)) {
        html += `<div style="margin:8px 0"><div style="font-weight:bold">► ${name} (${items.length})</div>`;
        items.forEach(item => {
          const label = item.tab.title.slice(0, 35);
          html += `<div style="margin-left:20px; display:flex; justify-content:space-between">
            └─ ${label} 
            <button style="background:#28a745;color:white;border:none;padding:2px 6px;font-size:10px;border-radius:3px;cursor:pointer" 
                    onclick="executeNudge(${item.tab.id}, '${item.nudge}')">
              ${item.nudge}
            </button>
          </div>`;
        });
        html += `</div>`;
      }
    }
  
    document.getElementById('tree').innerHTML = html;
    console.log('Tree rendered');
  }
  
  window.executeNudge = async (tabId, action) => {
    console.log('Executing nudge:', action, 'for tab:', tabId);
    const tabState = await chrome.storage.local.get(`tab_${tabId}`);
    let polished = tabState[`tab_${tabId}`]?.draft || tabState[`tab_${tabId}`]?.articleText || '';
    if (polished && (action === 'Finish PR' || action === 'Send Email')) {
      polished = await enhanceWithAI(polished, action === 'Finish PR' ? 'FINISH_PR' : 'SEND_EMAIL');
      alert(`Polished: ${polished}`);
    } else if (action === 'Review' && tabState[`tab_${tabId}`]?.articleText) {
      polished = await enhanceWithAI(tabState[`tab_${tabId}`].articleText, 'SUMMARIZE_ARTICLE');
      alert(polished);
    }
    await chrome.tabs.remove(tabId);
    console.log('Tab closed:', tabId);
    buildTree();
  };
  
  // Load on open
  buildTree();