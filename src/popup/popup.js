import { saveScreenshot, getScreenshots, deleteScreenshot } from '../db/indexeddb.js';

const dropzone = document.getElementById('dropzone');
const inbox = document.getElementById('inbox');
const trash = document.getElementById('trash');

/* ============================
   DROPZONE (ADD SCREENSHOTS)
============================ */

dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', async e => {
  e.preventDefault();
  dropzone.classList.remove('dragover');

  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = async () => {
    await saveScreenshot(reader.result);
    loadInbox();
  };
  reader.readAsDataURL(file);
});

/* ============================
   LOAD INBOX
============================ */

async function loadInbox() {
  inbox.innerHTML = '';
  const shots = await getScreenshots();

  shots.forEach(s => {
    const item = document.createElement('div');
    item.className = 'item';

    const img = document.createElement('img');
    img.src = s.image;
    img.draggable = true;

    img.addEventListener('click', async () => {
      const blob = await (await fetch(s.image)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
    
      img.classList.add('copied');
      setTimeout(() => img.classList.remove('copied'), 600);
    });

    // Start dragging screenshot
    img.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', s.id);
      img.classList.add('dragging');
    });

    // End dragging (UI cleanup only)
    img.addEventListener('dragend', () => {
      img.classList.remove('dragging');
    });

    item.appendChild(img);
    inbox.appendChild(item);
  });
}

/* ============================
   TRASH (DELETE ZONE)
============================ */

trash.addEventListener('dragover', e => {
  e.preventDefault();
  trash.classList.add('dragover');
});

trash.addEventListener('dragleave', () => {
  trash.classList.remove('dragover');
});

trash.addEventListener('drop', async e => {
  e.preventDefault();
  trash.classList.remove('dragover');

  const id = Number(e.dataTransfer.getData('text/plain'));
  if (!id) return;

  await deleteScreenshot(id);
  loadInbox();
});

/* ============================
   INIT
============================ */

loadInbox();
