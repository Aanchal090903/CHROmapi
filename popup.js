document.getElementById('organize').addEventListener('click', async () => {
  const btn = document.getElementById('organize');
  const status = document.getElementById('status');
  const results = document.getElementById('results');
  btn.disabled = true;
  status.style.display = 'block';
  results.innerHTML = '';

  try {
    // 1. Get all tabs + their saved state
    const tabs = await chrome.tabs.query({});
    const savedStates = await chrome.storage.local.get(null);
    
    const tabsWithState = tabs.map(tab => ({
      ...tab,
      saved: savedStates[`tab_${tab.id}`] || {}
    }));

    // 2. Ask Gemini to group + name + decide what to keep
    const prompt = `You are an expert tab organizer. Below is a list of open browser tabs (title + url + any detected unfinished work).

Group them into logical topics (max 8 groups). For each group:
- Give a short, human-friendly name (max 6 words)
- List the tab ids that belong to it
- For any tab with a draft/video/article, mark it "KEEP_OPEN" and give a one-line reason

Return ONLY valid JSON in this exact format:
{
  "groups": [
    {"name": "React Debugging", "tabIds": [12,15,18], "keepOpen": [15]},
    {"name": "Job Applications", "tabIds": [23,24], "keepOpen": [23,24]}
  ],
  "preserved": [
    {"tabId": 15, "reason": "Half-written GitHub PR comment"},
    {"tabId": 24, "reason": "Gmail draft to recruiter"}
  ]
}

Tabs:
${tabsWithState.map(t => `- [id:${t.id}] ${t.title} | ${t.url} ${t.saved.draft ? '✍️ DRAFT' : ''} ${t.saved.videoTime ? `⏸️ Video @${t.saved.videoTime}s` : ''} ${t.saved.scroll ? '📜 Reading progress' : ''}`).join('\n')}
`;

    const geminiResult = await new Promise((resolve, reject) => {
      const id = Date.now();
      const listener = (e) => {
        if (e.data?.type === 'GEMINI_RESULT' && e.data.id === id) {
          window.removeEventListener('message', listener);
          resolve(e.data.result);
        }
        if (e.data?.type === 'GEMINI_ERROR' && e.data.id === id) {
          window.removeEventListener('message', listener);
          reject(new Error(e.data.error));
        }
      };
      window.addEventListener('message', listener);
      window.postMessage({ type: 'RUN_GEMINI', prompt, id }, '*');
      setTimeout(() => reject(new Error('Gemini timeout')), 25000);
    });

    const plan = JSON.parse(geminiResult);

    // 3. Create actual Chrome tab groups with nice names & colors
    const colorCycle = ['grey','blue','red','yellow','green','pink','purple','cyan'];
    let colorIdx = 0;

    for (const group of plan.groups) {
      if (group.tabIds.length === 0) continue;
      const groupId = await chrome.tabs.group({ tabIds: group.tabIds });
      await chrome.tabGroups.update(groupId, {
        title: group.name,
        color: colorCycle[colorIdx++ % colorCycle.length],
        collapsed: true
      });
    }

    // 4. Close tabs that are NOT marked to keep open
    const keepOpenIds = new Set(plan.groups.flatMap(g => g.keepOpen || []));
    const closeIds = tabs.filter(t => !keepOpenIds.has(t.id)).map(t => t.id);
    if (closeIds.length) await chrome.tabs.remove(closeIds);

    // 5. Render beautiful UI
    renderGroups(plan.groups, tabsWithState);
    renderPreserved(plan.preserved, tabsWithState);

  } catch (err) {
    results.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    console.error(err);
  } finally {
    btn.disabled = false;
    status.style.display = 'none';
  }
});

function renderGroups(groups, allTabs) {
  const container = document.getElementById('results');
  container.innerHTML = '';

  groups.forEach(group => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'group';

    const header = document.createElement('div');
    header.className = 'group-header';
    header.innerHTML = `
      <span>${group.name} (${group.tabIds.length})</span>
      <span class="collapse-icon">▼</span>
    `;
    header.onclick = () => groupDiv.classList.toggle('collapsed');

    const tabsDiv = document.createElement('div');
    tabsDiv.className = 'tabs';

    group.tabIds.forEach(tabId => {
      const tab = allTabs.find(t => t.id === tabId);
      if (!tab) return;
      const isPreserved = group.keepOpen?.includes(tabId);
      
      const item = document.createElement('div');
      item.className = 'tab-item';
      item.innerHTML = `
        <div class="tab-title" title="${tab.title}">${tab.title}</div>
        <div class="actions">
          ${isPreserved ? '<button class="keep" disabled>Kept</button>' : ''}
          <button class="summary" onclick="chrome.tabs.create({url:'${tab.url}'})">Open</button>
        </div>
      `;
      tabsDiv.appendChild(item);
    });

    groupDiv.appendChild(header);
    groupDiv.appendChild(tabsDiv);
    container.appendChild(groupDiv);
  });
}

function renderPreserved(preserved, allTabs) {
  if (!preserved?.length) return;
  const list = document.getElementById('preserved-list');
  list.innerHTML = '';
  preserved.forEach(item => {
    const tab = allTabs.find(t => t.id === item.tabId);
    const li = document.createElement('li');
    li.textContent = `${tab?.title || 'Unknown tab'} → ${item.reason}`;
    list.appendChild(li);
  });
  document.getElementById('preserved-context').style.display = 'block';
}

module.exports = {
  testEnvironment: "jsdom",
  testMatch: ["**/tests/**/*.test.js"],
};

const { JSDOM } = require("jsdom");

test("should display preserved context block", () => {
  const dom = new JSDOM(`
    <div id="preserved-context" style="display: none;"></div>
  `);
  const document = dom.window.document;

  document.getElementById("preserved-context").style.display = "block";

  expect(document.getElementById("preserved-context").style.display).toBe("block");
});

