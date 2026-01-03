# SnapNest 🪺📸

SnapNest is a lightweight, local-first Chrome extension that lets you store screenshots in your browser and copy them to your clipboard with one click.

## Features
- Drag & drop screenshots into the extension
- Local storage using IndexedDB (no cloud, no tracking)
- One-click copy to clipboard
- Clean, cute inbox-style UI

## Why SnapNest?
Browsers restrict dragging images from extensions into websites.  
SnapNest solves this by using the Clipboard API, allowing fast paste into tools like ChatGPT, Docs, and Slack.

## Installation (Unpacked)
1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `snapnest` folder

## Tech Stack
- JavaScript (ES Modules)
- Chrome Extension Manifest V3
- IndexedDB
- Clipboard API

## Privacy
SnapNest does not collect, transmit, or store any data outside your browser.
