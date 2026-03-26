const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('c:/Users/DanielVenkat/.gemini/antigravity/scratch/it-support-ticketing/index.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

// Simulate the logic in app.js
const tabId = 'agents';

try {
  document.querySelectorAll('.admin-tab').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
  
  const targetTab = document.getElementById(`admin-tab-${tabId}`);
  if (targetTab) targetTab.classList.remove('hidden');

  const btn = Array.from(document.querySelectorAll('.admin-nav-item')).find(el => {
     const attr = el.getAttribute('onclick');
     if (!attr) console.log("Missing onclick on:", el.outerHTML);
     return attr && attr.includes(`('${tabId}')`);
  });
  if (btn) btn.classList.add('active');
  
  console.log("SUCCESS. btn found:", !!btn);
} catch (e) {
  console.log("ERROR:", e);
}
