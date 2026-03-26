/* ================================================
   HelpdeskPro — app.js
   Full IT Support Ticketing SPA (localStorage)
   ================================================ */

'use strict';

// ── Constants ──────────────────────────────────────
const STORAGE_KEY   = 'helpdesk_tickets';
const NOTIF_KEY     = 'helpdesk_notifications';
const SETTINGS_KEY  = 'helpdesk_settings';
const CURRENT_USER  = { name: 'John Doe', initials: 'JD', role: 'IT Administrator' };
let AGENTS = [];
const DEFAULT_AGENTS = [
  { id: 'a1', name: 'Sarah Chen',    initials: 'SC', group: 'Security' },
  { id: 'a2', name: 'Marcus Webb',   initials: 'MW', group: 'Network' },
  { id: 'a3', name: 'Priya Nair',    initials: 'PN', group: 'L1 Support' },
  { id: 'a4', name: 'Tom Bradley',   initials: 'TB', group: 'Application' },
  { id: 'unassigned', name: 'Unassigned', initials: '—', group: '—' },
];

let SLA_SETTINGS = { critical: 1, high: 4, medium: 8, low: 24 };
let EMAIL_CONFIG = { type: 'smtp', smtp: { host: '', port: '587', security: 'tls', from: '', user: '', pass: '' }, m365: { tenantId: '', clientId: '', clientSecret: '', from: '' } };
let EMAIL_TRIGGERS = { new: false, assign: false, resolve: false };

const STATUSES  = ['open','in-progress','on-hold','resolved','closed'];
const PRIORITIES = ['critical','high','medium','low'];
const CATEGORIES = {
  hardware:'Hardware', software:'Software', network:'Network',
  access:'Access & Accounts', email:'Email & Communication',
  security:'Security', other:'Other'
};
const PRIORITY_COLORS = { critical:'#ef4444', high:'#f97316', medium:'#f59e0b', low:'#64748b' };
const STATUS_COLORS   = {
  'open':'#3b82f6','in-progress':'#a855f7',
  'on-hold':'#f59e0b','resolved':'#10b981','closed':'#64748b'
};

// ── Seed Data ──────────────────────────────────────
const SEED_TICKETS = [
  {
    id:'TKT-0001', subject:'Laptop won\'t boot after Windows update', category:'software',
    priority:'high', status:'open', assignee:'a1',
    submitter:'Alice Nguyen', asset:'LAPTOP-042',
    description:'After installing the latest Windows cumulative update (KB5034441) last night, my laptop now shows a blue screen on boot with error code 0x0000007B. I cannot get past the boot screen. I have tried safe mode but it also fails.',
    created: daysAgo(3), updated: daysAgo(1),
    timeline:[
      { type:'created', text:'Ticket submitted by <strong>Alice Nguyen</strong>', ts: daysAgo(3) },
      { type:'assign',  text:'Assigned to <strong>Sarah Chen</strong>', ts: daysAgo(2) },
      { type:'comment', text:'We\'re investigating the update rollback. Will update shortly.', author:'Sarah Chen', ts: daysAgo(1) },
    ]
  },
  {
    id:'TKT-0002', subject:'VPN disconnects every 30 minutes', category:'network',
    priority:'medium', status:'in-progress', assignee:'a2',
    submitter:'David Patel', asset:'',
    description:'The VPN client drops connection approximately every 30 minutes and requires a manual reconnect. This is affecting remote workers significantly. Error in logs: "TLS handshake timeout". Affects approximately 12 users.',
    created: daysAgo(5), updated: daysAgo(1),
    timeline:[
      { type:'created', text:'Ticket submitted by <strong>David Patel</strong>', ts: daysAgo(5) },
      { type:'assign',  text:'Assigned to <strong>Marcus Webb</strong>', ts: daysAgo(4) },
      { type:'status',  text:'Status changed to <strong>In Progress</strong>', ts: daysAgo(3) },
      { type:'comment', text:'Identified issue with keep-alive settings on the Cisco ASA. Pushing a config change tonight.', author:'Marcus Webb', ts: daysAgo(1) },
    ]
  },
  {
    id:'TKT-0003', subject:'Printer on Floor 3 offline', category:'hardware',
    priority:'low', status:'resolved', assignee:'a3',
    submitter:'Emma Solis', asset:'Printer-Floor3',
    description:'The HP LaserJet on Floor 3 (asset tag HP-LJ-F3-02) is showing as offline. Users cannot print. The device appears to be powered on but not responding on the network.',
    created: daysAgo(7), updated: daysAgo(2),
    timeline:[
      { type:'created',  text:'Ticket submitted by <strong>Emma Solis</strong>', ts: daysAgo(7) },
      { type:'assign',   text:'Assigned to <strong>Priya Nair</strong>', ts: daysAgo(6) },
      { type:'status',   text:'Status changed to <strong>In Progress</strong>', ts: daysAgo(5) },
      { type:'comment',  text:'Found a bad network cable at the patch panel. Replaced and printer is back online.', author:'Priya Nair', ts: daysAgo(2) },
      { type:'resolved', text:'Ticket resolved by <strong>Priya Nair</strong>', ts: daysAgo(2) },
    ]
  },
  {
    id:'TKT-0004', subject:'Ransomware detected on DESKTOP-17', category:'security',
    priority:'critical', status:'in-progress', assignee:'a1',
    submitter:'Frank O\'Brien', asset:'DESKTOP-17',
    description:'Kaspersky endpoint flagged a ransomware variant (Ryuk) on DESKTOP-17 at 09:14 AM. The machine has been isolated from the network. Files in C:\\Users\\fobrien\\Documents appear to be encrypted. Immediate response required.',
    created: daysAgo(0), updated: daysAgo(0),
    timeline:[
      { type:'created', text:'Ticket submitted by <strong>Frank O\'Brien</strong>', ts: daysAgo(0) },
      { type:'assign',  text:'Escalated and assigned to <strong>Sarah Chen</strong>', ts: daysAgo(0) },
      { type:'comment', text:'Machine isolated. Begun forensic imaging. Do NOT reconnect to network.', author:'Sarah Chen', ts: daysAgo(0) },
    ]
  },
  {
    id:'TKT-0005', subject:'Outlook cannot connect to Exchange server', category:'email',
    priority:'high', status:'open', assignee:'unassigned',
    submitter:'Grace Kim', asset:'',
    description:'Since this morning, several users on the 2nd floor are unable to connect Outlook to the Exchange server. They receive "Cannot connect to server" errors. Webmail (OWA) works fine. Approx. 8 users affected.',
    created: daysAgo(1), updated: daysAgo(1),
    timeline:[
      { type:'created', text:'Ticket submitted by <strong>Grace Kim</strong>', ts: daysAgo(1) },
    ]
  },
  {
    id:'TKT-0006', subject:'Request access to SharePoint Finance site', category:'access',
    priority:'low', status:'closed', assignee:'a4',
    submitter:'Henry Liu', asset:'',
    description:'I need read-only access to the Finance SharePoint site for the Q2 audit preparation. My manager Lisa Park has approved this request.',
    created: daysAgo(10), updated: daysAgo(8),
    timeline:[
      { type:'created',  text:'Ticket submitted by <strong>Henry Liu</strong>', ts: daysAgo(10) },
      { type:'assign',   text:'Assigned to <strong>Tom Bradley</strong>', ts: daysAgo(9) },
      { type:'comment',  text:'Access granted. Please verify you can now access the site.', author:'Tom Bradley', ts: daysAgo(8) },
      { type:'resolved', text:'Ticket closed by <strong>Tom Bradley</strong>', ts: daysAgo(8) },
    ]
  },
  {
    id:'TKT-0007', subject:'Monitor flickering on workstation', category:'hardware',
    priority:'medium', status:'on-hold', assignee:'a2',
    submitter:'Isabella Torres', asset:'WS-MK-022',
    description:'The external Dell 27" monitor connected to my docking station has been flickering intermittently for 2 days. I\'ve tried different cables and the issue persists. The laptop screen is fine.',
    created: daysAgo(4), updated: daysAgo(2),
    timeline:[
      { type:'created', text:'Ticket submitted by <strong>Isabella Torres</strong>', ts: daysAgo(4) },
      { type:'assign',  text:'Assigned to <strong>Marcus Webb</strong>', ts: daysAgo(3) },
      { type:'status',  text:'Status changed to <strong>On Hold</strong> — waiting for replacement monitor from procurement', ts: daysAgo(2) },
    ]
  },
  {
    id:'TKT-0008', subject:'Software installation request: Adobe Premiere Pro', category:'software',
    priority:'low', status:'open', assignee:'unassigned',
    submitter:'James Okafor', asset:'LAPTOP-089',
    description:'The Marketing team requires Adobe Premiere Pro CC installed on LAPTOP-089 for the upcoming product launch video campaign. Business justification provided to IT manager.',
    created: daysAgo(2), updated: daysAgo(2),
    timeline:[
      { type:'created', text:'Ticket submitted by <strong>James Okafor</strong>', ts: daysAgo(2) },
    ]
  },
  {
    id:'TKT-0009', subject:'Wi-Fi dead zone in Conference Room B', category:'network',
    priority:'medium', status:'in-progress', assignee:'a3',
    submitter:'Karen Mills', asset:'',
    description:'Conference Room B on the 4th floor has virtually no Wi-Fi signal. Wired connection works. Important client meetings are scheduled this week. Signal drops to below -85 dBm inside the room.',
    created: daysAgo(6), updated: daysAgo(1),
    timeline:[
      { type:'created', text:'Ticket submitted by <strong>Karen Mills</strong>', ts: daysAgo(6) },
      { type:'assign',  text:'Assigned to <strong>Priya Nair</strong>', ts: daysAgo(5) },
      { type:'status',  text:'Status changed to <strong>In Progress</strong>', ts: daysAgo(3) },
      { type:'comment', text:'Surveyed with Wi-Fi analyzer. Planning to add an access point. Parts ordered.', author:'Priya Nair', ts: daysAgo(1) },
    ]
  },
  {
    id:'TKT-0010', subject:'Password reset — account locked after failed attempts', category:'access',
    priority:'high', status:'resolved', assignee:'a4',
    submitter:'Leo Fernandez', asset:'',
    description:'My Active Directory account has been locked out after 3 failed password attempts this morning. I cannot log in to my workstation or any company systems.',
    created: daysAgo(1), updated: hoursAgo(3),
    timeline:[
      { type:'created',  text:'Ticket submitted by <strong>Leo Fernandez</strong>', ts: daysAgo(1) },
      { type:'assign',   text:'Assigned to <strong>Tom Bradley</strong>', ts: daysAgo(1) },
      { type:'comment',  text:'Account unlocked and temporary password issued via secure channel.', author:'Tom Bradley', ts: hoursAgo(3) },
      { type:'resolved', text:'Ticket resolved by <strong>Tom Bradley</strong>', ts: hoursAgo(3) },
    ]
  },
  {
    id:'TKT-0011', subject:'Microsoft Teams crashes on startup', category:'software',
    priority:'medium', status:'open', assignee:'a1',
    submitter:'Mia Johansson', asset:'LAPTOP-061',
    description:'Teams crashes immediately on launch on my laptop. The splash screen appears then the app closes. I\'ve tried clearing the cache folder (%AppData%\\Microsoft\\Teams) but the issue persists. Running Teams version 1.6.00.25759.',
    created: daysAgo(3), updated: daysAgo(2),
    timeline:[
      { type:'created', text:'Ticket submitted by <strong>Mia Johansson</strong>', ts: daysAgo(3) },
      { type:'assign',  text:'Assigned to <strong>Sarah Chen</strong>', ts: daysAgo(2) },
    ]
  },
  {
    id:'TKT-0012', subject:'Server room cooling alarm triggered', category:'hardware',
    priority:'critical', status:'resolved', assignee:'a2',
    submitter:'Noah Bergman', asset:'SRV-ROOM-1',
    description:'The temperature alarm in Server Room 1 triggered at 08:45 AM. Temperature reading: 38°C (threshold 35°C). One of the two HVAC units appears to have failed. Servers are still running but this needs immediate attention.',
    created: daysAgo(14), updated: daysAgo(13),
    timeline:[
      { type:'created',  text:'Ticket submitted by <strong>Noah Bergman</strong>', ts: daysAgo(14) },
      { type:'assign',   text:'Escalated to <strong>Marcus Webb</strong>', ts: daysAgo(14) },
      { type:'comment',  text:'On-site. Failed HVAC unit identified. Facilities team called. Portable cooling deployed.', author:'Marcus Webb', ts: daysAgo(14) },
      { type:'resolved', text:'HVAC unit repaired by facilities. Temperature back to 21°C.', ts: daysAgo(13) },
    ]
  },
  {
    id:'TKT-0013', subject:'USB ports not working on docking station', category:'hardware',
    priority:'low', status:'open', assignee:'unassigned',
    submitter:'Olivia Reed', asset:'DOCK-HP-034',
    description:'None of the USB 3.0 ports on the HP Thunderbolt G4 docking station are working. The monitor and ethernet ports on the dock work fine. Devices are recognized when plugged directly into the laptop.',
    created: hoursAgo(5), updated: hoursAgo(5),
    timeline:[
      { type:'created', text:'Ticket submitted by <strong>Olivia Reed</strong>', ts: hoursAgo(5) },
    ]
  },
  {
    id:'TKT-0014', subject:'Phishing email received — potential breach', category:'security',
    priority:'critical', status:'open', assignee:'a1',
    submitter:'Paul Zhang', asset:'',
    description:'I received a very convincing phishing email purportedly from our CEO asking me to urgently wire transfer $15,000. The email domain was "acme-corp.co" instead of "acme-corp.com". I did not click any links but wanted to report immediately.',
    created: hoursAgo(2), updated: hoursAgo(2),
    timeline:[
      { type:'created', text:'Ticket submitted by <strong>Paul Zhang</strong>', ts: hoursAgo(2) },
      { type:'assign',  text:'Assigned to <strong>Sarah Chen</strong> (Security Team)', ts: hoursAgo(2) },
    ]
  },
  {
    id:'TKT-0015', subject:'Slow internet speed affecting entire office', category:'network',
    priority:'high', status:'on-hold', assignee:'a2',
    submitter:'Quinn Adams', asset:'',
    description:'Internet speeds have been extremely slow since Monday (today is Wednesday). Speed tests show 2 Mbps download vs our contracted 500 Mbps. All wired and wireless users are affected. ISP ticket raised — waiting for ISP response.',
    created: daysAgo(2), updated: daysAgo(1),
    timeline:[
      { type:'created', text:'Ticket submitted by <strong>Quinn Adams</strong>', ts: daysAgo(2) },
      { type:'assign',  text:'Assigned to <strong>Marcus Webb</strong>', ts: daysAgo(2) },
      { type:'status',  text:'Status changed to <strong>On Hold</strong> — ISP escalation ticket #ISP-88423 raised', ts: daysAgo(1) },
    ]
  },
];

// ── Date helpers ──────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function hoursAgo(n) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}
function fmtDateTIME(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' }) + ' ' +
         d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
}
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dy = Math.floor(h / 24);
  return `${dy}d ago`;
}
function genId(tickets) {
  const nums = tickets.map(t => parseInt(t.id.replace('TKT-', ''), 10)).filter(Boolean);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return 'TKT-' + String(next).padStart(4, '0');
}
function escHTML(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function categoryLabel(cat) { return CATEGORIES[cat] || cat; }
function agentName(id) {
  const a = AGENTS.find(a => a.id === id);
  return a ? a.name : '—';
}

// ── Storage ───────────────────────────────────────
const store = {
  loadTickets() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; }
    catch { return null; }
  },
  saveTickets(t) { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); },
  loadNotifs()  { try { return JSON.parse(localStorage.getItem(NOTIF_KEY)) || []; } catch { return []; } },
  saveNotifs(n) { localStorage.setItem(NOTIF_KEY, JSON.stringify(n)); },
  loadSettings(){ try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; } },
  saveSettings(s){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); },
};

// ── Badge helpers ─────────────────────────────────
function priorityBadge(p) {
  return `<span class="badge badge-${p}">${p.charAt(0).toUpperCase()+p.slice(1)}</span>`;
}
function statusBadge(s) {
  const label = s.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
  return `<span class="badge badge-${s}">${label}</span>`;
}

// ── SVG icons shorthand ───────────────────────────
const ICONS = {
  check: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
  x:     `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  info:  `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  warn:  `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
};

// ══════════════════════════════════════════════════
//   TOAST SYSTEM
// ══════════════════════════════════════════════════
const Toast = {
  show(message, type = 'info') {
    const iconMap = { success: ICONS.check, error: ICONS.x, info: ICONS.info, warning: ICONS.warn };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `${iconMap[type] || ICONS.info}<span>${escHTML(message)}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">${ICONS.close}</button>`;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, 4000);
  }
};

// ══════════════════════════════════════════════════
//   MAIN APP OBJECT
// ══════════════════════════════════════════════════
const app = {

  // --- AUTHENTICATION ---
  verifySession() {
    const raw = sessionStorage.getItem('helpdesk_session');
    if (raw) {
      CURRENT_USER = JSON.parse(raw);
      document.getElementById('mainLayout').className = 'layout-container app-unlocked';
      document.getElementById('view-login').className = 'hidden';
      // Adjust UI based on role
      document.getElementById('navAdminLink').style.display = CURRENT_USER.role === 'admin' ? 'flex' : 'none';
      return true;
    }
    document.getElementById('mainLayout').className = 'layout-container app-locked';
    document.getElementById('view-login').className = '';
    return false;
  },
  
  login() {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value;
    
    // Master admin fallback if no agents exist
    if (AGENTS.filter(a => a.id !== 'unassigned').length === 0 && u === 'admin' && p === 'admin') {
        CURRENT_USER = { id: 'admin', name: 'Master Admin', role: 'admin' };
    } else {
        const agent = AGENTS.find(a => a.username === u && a.password === p);
        if (!agent) {
            Toast.show('Invalid username or password', 'error');
            return;
        }
        CURRENT_USER = { id: agent.id, name: agent.name, role: agent.role };
    }
    
    sessionStorage.setItem('helpdesk_session', JSON.stringify(CURRENT_USER));
    Toast.show(`Welcome back, ${CURRENT_USER.name}`, 'success');
    document.getElementById('loginPass').value = '';
    
    this.verifySession();
    this.navigate('dashboard');
  },
  
  logout() {
    sessionStorage.removeItem('helpdesk_session');
    CURRENT_USER = null;
    this.verifySession();
  },

  tickets: [],
  notifications: [],
  currentView: 'dashboard',
  openTicketId: null,
  selectedTickets: new Set(),
  attachedFiles: [],

  // ── Init ─────────────────────────────────────
  init() {
    const saved = store.loadTickets();
    this.tickets = saved || JSON.parse(JSON.stringify(SEED_TICKETS));
    if (!saved) store.saveTickets(this.tickets);
    this.notifications = store.loadNotifs();

    const settings = store.loadSettings();
    if (settings.theme) document.documentElement.setAttribute('data-theme', settings.theme);
    
    // Load Admin Settings
    AGENTS = settings.agents || JSON.parse(JSON.stringify(DEFAULT_AGENTS));
    SLA_SETTINGS = settings.sla || SLA_SETTINGS;
    EMAIL_TRIGGERS = settings.emailTriggers || EMAIL_TRIGGERS;
    EMAIL_CONFIG = settings.emailConfig || EMAIL_CONFIG;
    if (!settings.agents) {
        settings.agents = AGENTS;
        store.saveSettings(settings);
    }

    this.setupUser();
    this.setupSidebar();
    this.setupTopbar();
    this.setupModal();
    this.setupNewTicketForm();
    this.setupFilters();
    this.setupGlobalSearch();
    this.setupTheme();
    this.setupNotifications();
    this.navigate('dashboard');
  },

  // ── User setup ────────────────────────────────
  setupUser() {
    document.getElementById('userDisplayName').textContent = CURRENT_USER.name;
    document.getElementById('userAvatar').textContent      = CURRENT_USER.initials;
    document.getElementById('topbarAvatar').textContent   = CURRENT_USER.initials;
    document.getElementById('topbarName').textContent     = CURRENT_USER.name;
    document.getElementById('dashGreetName').textContent  = CURRENT_USER.name.split(' ')[0];
  },

  // ── Sidebar ───────────────────────────────────
  setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle  = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');
    const mobileBtn = document.getElementById('mobileMenuBtn');

    toggle?.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    mobileBtn?.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('active');
      overlay.style.display = sidebar.classList.contains('mobile-open') ? 'block' : 'none';
    });
    overlay?.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.style.display = 'none';
    });

    document.querySelectorAll('.nav-link[data-view]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(link.dataset.view);
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('mobile-open');
          overlay.style.display = 'none';
        }
      });
    });
  },

  // ── Topbar ────────────────────────────────────
  setupTopbar() {
    document.getElementById('notificationBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('notifPanel').classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#notifPanel') && !e.target.closest('#notificationBtn')) {
        document.getElementById('notifPanel')?.classList.add('hidden');
      }
    });
  },

  // ── Theme ─────────────────────────────────────
  setupTheme() {
    document.getElementById('themeToggle')?.addEventListener('click', () => {
      const curr = document.documentElement.getAttribute('data-theme');
      const next = curr === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      const s = store.loadSettings(); s.theme = next; store.saveSettings(s);
    });
  },

  // ── Notifications ─────────────────────────────
  setupNotifications() {
    this.renderNotifications();
  },

  triggerEmail(triggerName, ticket, extra = '') {
    if (!EMAIL_TRIGGERS[triggerName]) return;
    let msg = '';
    if (triggerName === 'new') msg = `[Email Sent] To: Submitters & Tech Group — Re: New Ticket ${ticket.id}`;
    if (triggerName === 'assign') msg = `[Email Sent] To: ${agentName(ticket.assignee)} — Re: Assigned Ticket ${ticket.id}`;
    if (triggerName === 'resolve') msg = `[Email Sent] To: ${ticket.submitter} — Re: Ticket ${ticket.id} ${ticket.status}`;
    Toast.show(msg, 'success');
    this.addNotification(msg);
  },

  addNotification(text) {
    this.notifications.unshift({ text, ts: new Date().toISOString() });
    if (this.notifications.length > 20) this.notifications.pop();
    store.saveNotifs(this.notifications);
    document.getElementById('notifDot')?.classList.add('active');
    this.renderNotifications();
  },
  clearNotifications() {
    this.notifications = [];
    store.saveNotifs([]);
    document.getElementById('notifDot')?.classList.remove('active');
    this.renderNotifications();
    document.getElementById('notifPanel')?.classList.add('hidden');
  },
  renderNotifications() {
    const list = document.getElementById('notifList');
    if (!list) return;
    if (!this.notifications.length) {
      list.innerHTML = '<div class="notif-empty">No notifications</div>';
      return;
    }
    list.innerHTML = this.notifications.map(n => `
      <div class="notif-item">
        <div class="notif-item-text">${escHTML(n.text)}</div>
        <div class="notif-item-time">${timeAgo(n.ts)}</div>
      </div>`).join('');
  },

  // ── Navigation ────────────────────────────────
  navigate(view) {
    this.currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`nav-${view}`)?.classList.add('active');

    this.updateBadges();
    switch (view) {
      case 'dashboard':   this.renderDashboard(); break;
      case 'my-tickets':  this.renderMyTickets(); break;
      case 'all-tickets': this.renderAllTickets(); break;
      case 'admin':       this.renderAdmin(); break;
      case 'analytics':   this.renderAnalytics(); break;
      case 'new-ticket':  this.resetNewTicketForm(); break;
    }
  },

  updateBadges() {
    const open = this.tickets.filter(t => t.status === 'open' || t.status === 'in-progress');
    document.getElementById('myTicketsBadge').textContent = open.filter(t => t.submitter === CURRENT_USER.name).length || '';
    document.getElementById('allTicketsBadge').textContent = open.length || '';
  },

  // ══════════════════════════════════════════════
  //   DASHBOARD
  // ══════════════════════════════════════════════
  renderDashboard() {
    const t = this.tickets;
    const open       = t.filter(x => x.status === 'open').length;
    const inprog     = t.filter(x => x.status === 'in-progress').length;
    const resolvedTd = t.filter(x => x.status === 'resolved' && isToday(x.updated)).length;
    const critical   = t.filter(x => x.priority === 'critical' && x.status !== 'closed' && x.status !== 'resolved').length;
    document.getElementById('stat-open').textContent       = open;
    document.getElementById('stat-inprogress').textContent = inprog;
    document.getElementById('stat-resolved').textContent   = resolvedTd;
    document.getElementById('stat-critical').textContent   = critical;
    document.getElementById('stat-total').textContent      = t.length;
    document.getElementById('stat-avg-resp').textContent   = '2.4';
    document.getElementById('stat-open-delta').textContent       = `${open} active`;
    document.getElementById('stat-inprogress-delta').textContent = `${inprog} in queue`;
    document.getElementById('stat-resolved-delta').textContent   = 'today';
    document.getElementById('stat-critical-delta').textContent   = critical > 0 ? '🔴 needs attention' : '✅ clear';
    document.getElementById('stat-total-delta').textContent      = 'all time';
    document.getElementById('stat-avg-resp-delta').textContent   = 'avg hours';

    this.renderCategoryChart();
    this.renderPriorityChart();
    this.renderRecentTickets();
    this.renderActivityFeed();
  },

  renderCategoryChart() {
    const el = document.getElementById('categoryChart');
    if (!el) return;
    const counts = {};
    this.tickets.forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1; });
    const max = Math.max(...Object.values(counts), 1);
    const colors = { hardware:'#3b82f6', software:'#a855f7', network:'#14b8a6',
      access:'#f59e0b', email:'#f97316', security:'#ef4444', other:'#64748b' };
    el.innerHTML = `<div class="bar-chart">${Object.entries(counts).map(([cat, n]) => `
      <div class="bar-group">
        <div class="bar-wrap">
          <span class="bar-value">${n}</span>
          <div class="bar" style="height:${Math.max((n/max)*140,4)}px;background:${colors[cat]||'#6366f1'}"></div>
        </div>
        <span class="bar-label">${categoryLabel(cat)}</span>
      </div>`).join('')}</div>`;
  },

  renderPriorityChart() {
    const el = document.getElementById('priorityChart');
    if (!el) return;
    const counts = { critical:0, high:0, medium:0, low:0 };
    this.tickets.forEach(t => { if (counts[t.priority] !== undefined) counts[t.priority]++; });
    const total = Object.values(counts).reduce((a,b) => a+b, 0) || 1;
    const colors = { critical:'#ef4444', high:'#f97316', medium:'#f59e0b', low:'#64748b' };
    const r = 60, cx = 70, cy = 70, circumference = 2 * Math.PI * r;
    let offset = 0;
    const slices = Object.entries(counts).map(([p, n]) => {
      const pct = n / total;
      const dash = pct * circumference;
      const slice = { p, n, pct, dash, offset };
      offset += dash;
      return slice;
    });
    const svgSlices = slices.map(s =>
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[s.p]}"
        stroke-width="26" stroke-dasharray="${s.dash} ${circumference - s.dash}"
        stroke-dashoffset="${-s.offset}" style="transition:stroke-dasharray .5s ease"/>`
    ).join('');
    el.innerHTML = `
      <div class="donut-area">
        <div class="donut-svg-wrap">
          <svg width="140" height="140" style="transform:rotate(-90deg)">
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--bg-elevated)" stroke-width="26"/>
            ${svgSlices}
          </svg>
        </div>
        <div class="donut-legend">
          ${slices.map(s => `
            <div class="donut-legend-item">
              <span class="donut-dot" style="background:${colors[s.p]}"></span>
              <span>${s.p.charAt(0).toUpperCase()+s.p.slice(1)}: <strong>${s.n}</strong></span>
            </div>`).join('')}
        </div>
      </div>`;
  },

  renderRecentTickets() {
    const el = document.getElementById('recentTicketsList');
    if (!el) return;
    const recent = [...this.tickets].sort((a,b) => new Date(b.updated) - new Date(a.updated)).slice(0,8);
    el.innerHTML = recent.map(t => `
      <div class="recent-item" onclick="app.openTicket('${t.id}')">
        <span class="recent-item-id">${t.id}</span>
        <span class="recent-item-subject">${escHTML(t.subject)}</span>
        ${priorityBadge(t.priority)}
        ${statusBadge(t.status)}
        <span class="recent-item-meta">${timeAgo(t.updated)}</span>
      </div>`).join('');
  },

  renderActivityFeed() {
    const el = document.getElementById('activityFeed');
    if (!el) return;
    const colors = { created:'#6366f1', assign:'#f59e0b', status:'#14b8a6', comment:'#3b82f6', resolved:'#10b981' };
    const events = [];
    this.tickets.forEach(t => {
      (t.timeline || []).forEach(ev => {
        events.push({ ...ev, ticketId: t.id, ticketSubj: t.subject });
      });
    });
    events.sort((a,b) => new Date(b.ts) - new Date(a.ts));
    const feed = events.slice(0, 10);
    el.innerHTML = feed.map(ev => `
      <div class="activity-item">
        <div class="activity-dot" style="background:${colors[ev.type]||'#6366f1'}"></div>
        <div class="activity-content">
          <div class="activity-text"><a href="#" onclick="app.openTicket('${ev.ticketId}');return false" style="color:var(--accent)">${ev.ticketId}</a> — ${ev.text}</div>
          <div class="activity-time">${timeAgo(ev.ts)}</div>
        </div>
      </div>`).join('');
  },

  // ══════════════════════════════════════════════
  //   TICKET LIST (shared renderer)
  // ══════════════════════════════════════════════
  renderTicketTable(tickets, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!tickets.length) {
      el.innerHTML = `<div class="ticket-table-wrap"><div class="table-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
        <h3>No tickets found</h3><p>Try adjusting your filters</p></div></div>`;
      return;
    }
    el.innerHTML = `<div class="ticket-table-wrap"><table class="ticket-table">
      <thead><tr>
        <th class="col-check"><input type="checkbox" id="checkAll" onchange="app.toggleCheckAll(this)"></th>
        <th class="col-id">ID</th>
        <th>Subject</th>
        <th class="col-pri">Priority</th>
        <th class="col-status">Status</th>
        <th class="col-cat">Category</th>
        <th class="col-agent">Assignee</th>
        <th class="col-date">Updated</th>
      </tr></thead>
      <tbody>${tickets.map(t => `
        <tr onclick="app.openTicket('${t.id}')" data-id="${t.id}" class="${this.selectedTickets.has(t.id)?'selected':''}">
          <td class="col-check" onclick="event.stopPropagation()">
            <input type="checkbox" data-id="${t.id}" ${this.selectedTickets.has(t.id)?'checked':''} onchange="app.toggleCheck(this,'${t.id}')">
          </td>
          <td class="ticket-id-cell">${t.id}</td>
          <td>${escHTML(t.subject)}</td>
          <td>${priorityBadge(t.priority)}</td>
          <td>${statusBadge(t.status)}</td>
          <td>${escHTML(categoryLabel(t.category))}</td>
          <td>${escHTML(agentName(t.assignee))}</td>
          <td>${timeAgo(t.updated)}</td>
        </tr>`).join('')}
      </tbody></table></div>`;
  },

  renderMyTickets() {
    const mine = this.tickets.filter(t => t.submitter === CURRENT_USER.name);
    this.renderTicketTable(mine, 'myTicketsContent');
  },

  renderAllTickets() {
    const filtered = this.getFilteredTickets();
    this.renderTicketTable(filtered, 'allTicketsContent');
  },

  getFilteredTickets() {
    const status   = document.getElementById('filterStatus')?.value;
    const priority = document.getElementById('filterPriority')?.value;
    const category = document.getElementById('filterCategory')?.value;
    const sort     = document.getElementById('filterSort')?.value || 'newest';
    const search   = document.getElementById('ticketSearch')?.value.toLowerCase().trim();

    let list = [...this.tickets];
    if (status)   list = list.filter(t => t.status === status);
    if (priority) list = list.filter(t => t.priority === priority);
    if (category) list = list.filter(t => t.category === category);
    if (search)   list = list.filter(t =>
      t.subject.toLowerCase().includes(search) ||
      t.id.toLowerCase().includes(search) ||
      t.submitter.toLowerCase().includes(search) ||
      categoryLabel(t.category).toLowerCase().includes(search));

    const sortFns = {
      newest:   (a,b) => new Date(b.created) - new Date(a.created),
      oldest:   (a,b) => new Date(a.created) - new Date(b.created),
      updated:  (a,b) => new Date(b.updated) - new Date(a.updated),
      priority: (a,b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority),
    };
    list.sort(sortFns[sort] || sortFns.newest);
    return list;
  },

  setupFilters() {
    ['filterStatus','filterPriority','filterCategory','filterSort','ticketSearch'].forEach(id => {
      document.getElementById(id)?.addEventListener('input',  () => this.currentView === 'all-tickets' && this.renderAllTickets());
      document.getElementById(id)?.addEventListener('change', () => this.currentView === 'all-tickets' && this.renderAllTickets());
    });
  },

  setupGlobalSearch() {
    document.getElementById('globalSearch')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = e.target.value.trim();
        if (!q) return;
        this.navigate('all-tickets');
        document.getElementById('ticketSearch').value = q;
        this.renderAllTickets();
        e.target.value = '';
      }
    });
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('globalSearch')?.focus();
      }
    });
  },

  // ── Checkbox handling ─────────────────────────
  toggleCheck(el, id) {
    if (el.checked) this.selectedTickets.add(id);
    else this.selectedTickets.delete(id);
    const row = el.closest('tr');
    if (row) row.classList.toggle('selected', el.checked);
  },
  toggleCheckAll(el) {
    document.querySelectorAll('input[data-id]').forEach(cb => {
      cb.checked = el.checked;
      const id = cb.dataset.id;
      if (el.checked) this.selectedTickets.add(id);
      else this.selectedTickets.delete(id);
      cb.closest('tr')?.classList.toggle('selected', el.checked);
    });
  },
  selectAllTickets() {
    this.tickets.forEach(t => this.selectedTickets.add(t.id));
    this.renderAllTickets();
  },

  // ══════════════════════════════════════════════
  //   TICKET MODAL
  // ══════════════════════════════════════════════
  setupModal() {
    document.getElementById('modalClose')?.addEventListener('click',    () => this.closeModal());
    document.getElementById('ticketModal')?.addEventListener('click',   (e) => { if (e.target === e.currentTarget) this.closeModal(); });
    document.getElementById('saveTicketBtn')?.addEventListener('click', () => this.saveTicketChanges());
    document.getElementById('deleteTicketBtn')?.addEventListener('click', () => this.deleteTicket());
    document.getElementById('addCommentBtn')?.addEventListener('click', () => this.addComment());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeModal(); });
  },

  openTicket(id) {
    const t = this.tickets.find(x => x.id === id);
    if (!t) return;
    this.openTicketId = id;

    document.getElementById('modalTicketId').textContent  = t.id;
    document.getElementById('modalSubject').textContent   = t.subject;
    document.getElementById('modalDescription').textContent = t.description;
    document.getElementById('modalCategory').textContent  = categoryLabel(t.category);
    document.getElementById('modalSubmitter').textContent = t.submitter;
    document.getElementById('modalCreated').textContent   = fmtDateTIME(t.created);
    document.getElementById('modalUpdated').textContent   = fmtDateTIME(t.updated);
    document.getElementById('modalAsset').textContent     = t.asset || '—';

    // Meta row
    document.getElementById('modalMetaRow').innerHTML =
      `${priorityBadge(t.priority)} ${statusBadge(t.status)}
       <span class="badge" style="background:var(--bg-elevated);color:var(--text-secondary)">${categoryLabel(t.category)}</span>`;

    // Status select
    const statusSel = document.getElementById('modalStatus');
    statusSel.innerHTML = STATUSES.map(s =>
      `<option value="${s}" ${t.status===s?'selected':''}>${s.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')}</option>`
    ).join('');

    // Priority select
    document.getElementById('modalPriority').value = t.priority;

    // Assignee select
    const agentSel = document.getElementById('modalAssignee');
    agentSel.innerHTML = AGENTS.map(a =>
      `<option value="${a.id}" ${t.assignee===a.id?'selected':''}>${a.name}</option>`
    ).join('');

    // Timeline
    this.renderTimeline(t);

    document.getElementById('commentInput').value = '';
    document.getElementById('ticketModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  },

  renderTimeline(t) {
    const el = document.getElementById('modalTimeline');
    if (!el) return;
    const colors = { created:'#6366f1', assign:'#f59e0b', status:'#14b8a6', comment:'#3b82f6', resolved:'#10b981' };
    el.innerHTML = (t.timeline || []).map(ev => `
      <div class="timeline-item">
        <div class="timeline-line-wrap">
          <div class="timeline-dot" style="background:${colors[ev.type]||'#6366f1'}"></div>
          <div class="timeline-vline"></div>
        </div>
        <div class="timeline-body">
          <div class="timeline-action">${ev.text}</div>
          ${ev.author ? `<div class="timeline-comment">${escHTML(ev.text && ev.type==='comment' ? ev.text : '')}</div>` : ''}
          <div class="timeline-ts">${fmtDateTIME(ev.ts)} · ${timeAgo(ev.ts)}</div>
        </div>
      </div>`).join('');
  },

  closeModal() {
    document.getElementById('ticketModal').classList.add('hidden');
    document.body.style.overflow = '';
    this.openTicketId = null;
  },

  saveTicketChanges() {
    const t = this.tickets.find(x => x.id === this.openTicketId);
    if (!t) return;
    const newStatus   = document.getElementById('modalStatus').value;
    const newPriority = document.getElementById('modalPriority').value;
    const newAssignee = document.getElementById('modalAssignee').value;
    const changes = [];
    if (newStatus !== t.status) {
      changes.push({ type:'status', text:`Status changed to <strong>${newStatus.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')}</strong>`, ts: new Date().toISOString() });
    }
    if (newPriority !== t.priority) {
      changes.push({ type:'status', text:`Priority changed to <strong>${newPriority}</strong>`, ts: new Date().toISOString() });
    }
    if (newAssignee !== t.assignee) {
      changes.push({ type:'assign', text:`Reassigned to <strong>${agentName(newAssignee)}</strong>`, ts: new Date().toISOString() });
    }
    t.status   = newStatus;
    t.priority = newPriority;
    t.assignee = newAssignee;
    t.updated  = new Date().toISOString();
    t.timeline = [...(t.timeline || []), ...changes];

    store.saveTickets(this.tickets);
    changes.forEach(c => this.addNotification(`${t.id}: ${c.text.replace(/<[^>]+>/g,'')}`));
    this.closeModal();
    this.navigate(this.currentView);
    Toast.show('Ticket updated successfully', 'success');
    if (newAssignee !== t.assignee && newAssignee !== 'unassigned') this.triggerEmail('assign', t);
    if ((newStatus === 'resolved' || newStatus === 'closed') && newStatus !== t.status) this.triggerEmail('resolve', t);
  },

  deleteTicket() {
    if (!confirm('Are you sure you want to delete this ticket? This cannot be undone.')) return;
    this.tickets = this.tickets.filter(t => t.id !== this.openTicketId);
    store.saveTickets(this.tickets);
    this.closeModal();
    this.navigate(this.currentView);
    Toast.show('Ticket deleted', 'info');
  },

  addComment() {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text) { Toast.show('Please enter a comment', 'warning'); return; }
    const t = this.tickets.find(x => x.id === this.openTicketId);
    if (!t) return;
    const ev = { type:'comment', text: escHTML(text), author: CURRENT_USER.name, ts: new Date().toISOString() };
    t.timeline.push(ev);
    t.updated = ev.ts;
    store.saveTickets(this.tickets);
    input.value = '';
    this.renderTimeline(t);
    this.addNotification(`New comment on ${t.id} by ${CURRENT_USER.name}`);
    Toast.show('Comment posted', 'success');
  },

  // ══════════════════════════════════════════════
  //   NEW TICKET FORM
  // ══════════════════════════════════════════════
  setupNewTicketForm() {
    const form = document.getElementById('newTicketForm');
    const desc = document.getElementById('ticketDescription');
    desc?.addEventListener('input', () => {
      const count = desc.value.length;
      document.getElementById('descCharCount').textContent = `${count} / 2000`;
      if (count > 2000) desc.value = desc.value.slice(0, 2000);
    });

    const fileInput = document.getElementById('fileInput');
    const fileDrop  = document.getElementById('fileDrop');
    fileInput?.addEventListener('change', () => this.handleFiles(fileInput.files));
    fileDrop?.addEventListener('dragover', (e) => { e.preventDefault(); fileDrop.style.borderColor='var(--accent)'; });
    fileDrop?.addEventListener('dragleave', () => { fileDrop.style.borderColor=''; });
    fileDrop?.addEventListener('drop', (e) => { e.preventDefault(); fileDrop.style.borderColor=''; this.handleFiles(e.dataTransfer.files); });

    form?.addEventListener('submit', (e) => { e.preventDefault(); this.submitTicket(); });
  },

  handleFiles(files) {
    Array.from(files).forEach(f => this.attachedFiles.push(f.name));
    const list = document.getElementById('fileList');
    if (list) list.innerHTML = this.attachedFiles.map(n =>
      `<div class="file-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/></svg>${escHTML(n)}</div>`
    ).join('');
  },

  resetNewTicketForm() {
    document.getElementById('newTicketForm')?.reset();
    document.getElementById('descCharCount').textContent = '0 / 2000';
    document.getElementById('fileList').innerHTML = '';
    this.attachedFiles = [];
    ['companyError','contactNameError','emailError','subjectError','categoryError','descError'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  },

  submitTicket() {
    const company = document.getElementById('ticketCompany').value.trim();
    const contactName = document.getElementById('ticketContactName').value.trim();
    const email = document.getElementById('ticketEmail').value.trim();
    const phone = document.getElementById('ticketPhone').value.trim();
    const subject  = document.getElementById('ticketSubject').value.trim();
    const category = document.getElementById('ticketCategory').value;
    const desc     = document.getElementById('ticketDescription').value.trim();
    const priority = document.querySelector('input[name="priority"]:checked')?.value || 'medium';
    const asset    = document.getElementById('ticketAsset').value.trim();

    let valid = true;
    if (!company) { document.getElementById('companyError').textContent = 'Company is required'; valid = false; } else document.getElementById('companyError').textContent = '';
    if (!contactName) { document.getElementById('contactNameError').textContent = 'Contact Name is required'; valid = false; } else document.getElementById('contactNameError').textContent = '';
    if (!email || !email.includes('@')) { document.getElementById('emailError').textContent = 'Valid email is required'; valid = false; } else document.getElementById('emailError').textContent = '';
    if (!subject) { document.getElementById('subjectError').textContent = 'Subject is required'; valid = false; }
    else document.getElementById('subjectError').textContent = '';
    if (!category) { document.getElementById('categoryError').textContent = 'Please select a category'; valid = false; }
    else document.getElementById('categoryError').textContent = '';
    if (desc.length < 10) { document.getElementById('descError').textContent = 'Description must be at least 10 characters'; valid = false; }
    else document.getElementById('descError').textContent = '';
    if (!valid) return;

    const now = new Date().toISOString();
    const ticket = {
      id: genId(this.tickets),
      company, contactName, email, phone,
      subject, category, priority, status: 'open',
      assignee: 'unassigned', submitter: contactName || (CURRENT_USER ? CURRENT_USER.name : 'Unknown User'),
      asset, description: desc,
      created: now, updated: now,
      timeline: [{ type:'created', text:`Ticket submitted by <strong>${escHTML(CURRENT_USER.name)}</strong>`, ts: now }]
    };
    this.tickets.unshift(ticket);
    store.saveTickets(this.tickets);
    this.addNotification(`New ticket ${ticket.id} submitted: ${ticket.subject}`);
    Toast.show(`Ticket ${ticket.id} submitted successfully!`, 'success');
    this.triggerEmail('new', ticket);
    this.navigate('my-tickets');
  },

  // ══════════════════════════════════════════════
  //   ADMIN
  // ══════════════════════════════════════════════
  renderAdmin() {
    this.switchAdminTab('general');
  },

  switchAdminTab(tabId) {
    document.querySelectorAll('.admin-tab').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById(`admin-tab-${tabId}`);
    if (targetTab) targetTab.classList.remove('hidden');
    
    const btn = Array.from(document.querySelectorAll('.admin-nav-item')).find(el => el.getAttribute('onclick').includes(`('${tabId}')`));
    if (btn) btn.classList.add('active');

    if (tabId === 'general') {
      const unassigned = this.tickets.filter(t => t.assignee === 'unassigned' && t.status !== 'closed' && t.status !== 'resolved');
      const el = document.getElementById('unassignedList');
      if (el) {
        el.innerHTML = unassigned.length
          ? unassigned.map(t => `<div class="recent-item" onclick="app.openTicket('${t.id}')"><span class="recent-item-id">${t.id}</span><span class="recent-item-subject">${escHTML(t.subject)}</span>${priorityBadge(t.priority)}</div>`).join('')
          : '<div class="table-empty" style="padding:1rem"><p>No unassigned tickets 🎉</p></div>';
      }
      const workload = document.getElementById('agentWorkload');
      if (workload) {
        const maxLoad = Math.max(...AGENTS.filter(a => a.id !== 'unassigned').map(a => this.tickets.filter(t => t.assignee === a.id && t.status !== 'closed').length), 1);
        workload.innerHTML = AGENTS.filter(a => a.id !== 'unassigned').map(a => {
          const count = this.tickets.filter(t => t.assignee === a.id && t.status !== 'closed').length;
          return `<div class="agent-row"><div class="user-avatar sm">${a.initials}</div><span class="agent-name">${a.name}</span><div class="agent-bar-wrap"><div class="agent-bar" style="width:${(count/maxLoad)*100}%"></div></div><span class="agent-count">${count} tickets</span></div>`;
        }).join('');
      }
    } else if (tabId === 'agents') {
      this.renderAdminAgents();
    } else if (tabId === 'sla') {
      this.renderAdminSLA();
    } else if (tabId === 'email') {
      document.getElementById('email-trigger-new').checked = EMAIL_TRIGGERS['new'];
      document.getElementById('email-trigger-assign').checked = EMAIL_TRIGGERS['assign'];
      document.getElementById('email-trigger-resolve').checked = EMAIL_TRIGGERS['resolve'];
      if(document.getElementById('emailConnType')) {
          document.getElementById('emailConnType').value = EMAIL_CONFIG.type || 'smtp';
          
          // Populate SMTP
          document.getElementById('smtpHost').value = EMAIL_CONFIG.smtp?.host || '';
          document.getElementById('smtpPort').value = EMAIL_CONFIG.smtp?.port || '';
          document.getElementById('smtpSecurity').value = EMAIL_CONFIG.smtp?.security || 'tls';
          document.getElementById('smtpFrom').value = EMAIL_CONFIG.smtp?.from || '';
          document.getElementById('smtpUser').value = EMAIL_CONFIG.smtp?.user || '';
          document.getElementById('smtpPass').value = EMAIL_CONFIG.smtp?.pass || '';
          
          // Populate M365
          document.getElementById('m365Tenant').value = EMAIL_CONFIG.m365?.tenantId || '';
          document.getElementById('m365Client').value = EMAIL_CONFIG.m365?.clientId || '';
          document.getElementById('m365Secret').value = EMAIL_CONFIG.m365?.clientSecret || '';
          document.getElementById('m365From').value = EMAIL_CONFIG.m365?.from || '';
          
          app.toggleEmailConfigView();
      }
    }
  },

  renderAdminAgents() {
    const el = document.getElementById('adminAgentsList');
    if (!el) return;
    el.innerHTML = `<table class="ticket-table">
      <thead><tr><th>Name</th><th>Initials</th><th>Group</th><th>Actions</th></tr></thead>
      <tbody>${AGENTS.filter(a => a.id !== 'unassigned').map(a => `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:12px">
              <div class="user-avatar sm">${a.initials}</div>
              <strong>${a.name}</strong>
            </div>
          </td>
          <td>${a.initials}</td>
          <td><span class="badge" style="background:var(--bg-elevated);color:var(--text-secondary)">${a.group || 'General'}</span></td>
          <td><button class="btn btn-ghost" style="color:var(--text-danger)" onclick="app.deleteAgent('${a.id}')">Delete</button></td>
        </tr>`).join('')}
      </tbody></table>`;
  },

  addAgent() {
    const nameInput = document.getElementById('newAgentName');
    const groupInput = document.getElementById('newAgentGroup');
    const name = nameInput.value.trim();
    if (!name) { Toast.show('Agent name is required', 'warning'); return; }
    
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'XX';
    const newId = 'a' + Date.now().toString().slice(-4);
    
    const uUser = document.getElementById('newAgentUser')?.value.trim() || '';
    const uPass = document.getElementById('newAgentPass')?.value || '';
    const uRole = document.getElementById('newAgentRole')?.value || 'technician';
    if (!uUser || !uPass) { Toast.show('Username and Password are required', 'warning'); return; }
    
    const newAgent = { id: newId, name, initials, group: groupInput.value, username: uUser, password: uPass, role: uRole };
    // Insert before unassigned
    const unassign = AGENTS.find(a => a.id === 'unassigned');
    AGENTS = AGENTS.filter(a => a.id !== 'unassigned');
    AGENTS.push(newAgent);
    AGENTS.push(unassign);
    
    const s = store.loadSettings(); s.agents = AGENTS; store.saveSettings(s);
    nameInput.value = '';
    this.renderAdminAgents();
    Toast.show(`Agent ${name} added successfully`, 'success');
  },

  deleteAgent(id) {
    if (id === 'a1' && AGENTS.length <= 2) { Toast.show('Cannot delete the last remaining agent', 'warning'); return; }
    if (!confirm('Delete this agent? (Tickets assigned to them will show their ID if not reassigned first)')) return;
    AGENTS = AGENTS.filter(a => a.id !== id);
    const s = store.loadSettings(); s.agents = AGENTS; store.saveSettings(s);
    this.renderAdminAgents();
    Toast.show('Agent deleted', 'info');
  },

  renderAdminSLA() {
    const el = document.getElementById('slaTbody');
    if (!el) return;
    el.innerHTML = PRIORITIES.map(p => `
      <tr>
        <td>${priorityBadge(p)}</td>
        <td><div style="display:flex;align-items:center;gap:8px">
          <input type="number" id="sla-input-${p}" class="form-input" style="width:100px" value="${SLA_SETTINGS[p]}" min="1" max="720">
          <span style="color:var(--text-secondary);font-size:13px">hours</span>
        </div></td>
      </tr>
    `).join('');
  },

  saveSLA() {
    PRIORITIES.forEach(p => {
      const val = parseInt(document.getElementById(`sla-input-${p}`).value, 10);
      if (!isNaN(val) && val > 0) SLA_SETTINGS[p] = val;
    });
    const s = store.loadSettings(); s.sla = SLA_SETTINGS; store.saveSettings(s);
    Toast.show('SLA settings saved successfully', 'success');
  },

  toggleEmailConfigView() {
    const type = document.getElementById('emailConnType').value;
    document.getElementById('smtpConfigBlock').style.display = type === 'smtp' ? 'grid' : 'none';
    document.getElementById('m365ConfigBlock').style.display = type === 'm365' ? 'grid' : 'none';
  },

  saveEmailConfig() {
    EMAIL_CONFIG.type = document.getElementById('emailConnType').value;
    EMAIL_CONFIG.smtp = {
      host: document.getElementById('smtpHost').value.trim(),
      port: document.getElementById('smtpPort').value.trim(),
      security: document.getElementById('smtpSecurity').value,
      from: document.getElementById('smtpFrom').value.trim(),
      user: document.getElementById('smtpUser').value.trim(),
      pass: document.getElementById('smtpPass').value
    };
    EMAIL_CONFIG.m365 = {
      tenantId: document.getElementById('m365Tenant').value.trim(),
      clientId: document.getElementById('m365Client').value.trim(),
      clientSecret: document.getElementById('m365Secret').value,
      from: document.getElementById('m365From').value.trim()
    };
    const s = store.loadSettings(); s.emailConfig = EMAIL_CONFIG; store.saveSettings(s);
    Toast.show('Email Configuration saved successfully', 'success');
  },

  testEmailConfig() {
    if (EMAIL_CONFIG.type === 'smtp') {
      if (!EMAIL_CONFIG.smtp.host) return Toast.show('Please configure SMTP Host first', 'warning');
      Toast.show(`Simulating SMTP auth via ${EMAIL_CONFIG.smtp.host}...`, 'info');
      setTimeout(() => Toast.show(`[SMTP SUCCESS] Test email sent from ${EMAIL_CONFIG.smtp.from || 'test@example.com'}`, 'success'), 1500);
    } else {
      if (!EMAIL_CONFIG.m365.clientId) return Toast.show('Please configure Client ID first', 'warning');
      Toast.show(`Simulating Microsoft 365 OAuth flow...`, 'info');
      setTimeout(() => Toast.show(`[M365 SUCCESS] Token acquired & email sent from ${EMAIL_CONFIG.m365.from || 'test@example.com'}`, 'success'), 1600);
    }
  },

  saveEmailSettings() {
    EMAIL_TRIGGERS['new'] = document.getElementById('email-trigger-new').checked;
    EMAIL_TRIGGERS['assign'] = document.getElementById('email-trigger-assign').checked;
    EMAIL_TRIGGERS['resolve'] = document.getElementById('email-trigger-resolve').checked;
    const s = store.loadSettings(); s.emailTriggers = EMAIL_TRIGGERS; store.saveSettings(s);
    Toast.show('Email triggers updated', 'success');
  },


  applyBulkAction() {
    const action = document.getElementById('bulkAction').value;
    if (!action) { Toast.show('Select an action first', 'warning'); return; }
    if (!this.selectedTickets.size) { Toast.show('Select at least one ticket', 'warning'); return; }
    if (action === 'delete' && !confirm(`Delete ${this.selectedTickets.size} ticket(s)?`)) return;
    this.selectedTickets.forEach(id => {
      if (action === 'delete') { this.tickets = this.tickets.filter(t => t.id !== id); }
      else {
        const t = this.tickets.find(x => x.id === id);
        if (t) { t.status = action === 'resolve' ? 'resolved' : 'closed'; t.updated = new Date().toISOString(); }
      }
    });
    this.selectedTickets.clear();
    store.saveTickets(this.tickets);
    Toast.show(`Bulk action applied to selected tickets`, 'success');
    if (action === 'resolve' || action === 'close') {
      this.selectedTickets.forEach(id => {
         const t = this.tickets.find(x => x.id === id);
         if (t) this.triggerEmail('resolve', t);
      });
    }
    this.renderAdmin();
  },

  resetData() {
    if (!confirm('This will delete all tickets and restore demo data. Are you sure?')) return;
    this.tickets = JSON.parse(JSON.stringify(SEED_TICKETS));
    store.saveTickets(this.tickets);
    this.notifications = [];
    store.saveNotifs([]);
    Toast.show('Demo data restored', 'info');
    this.navigate('dashboard');
  },

  // ══════════════════════════════════════════════
  //   ANALYTICS
  // ══════════════════════════════════════════════
  renderAnalytics() {
    this.renderAnalyticsStatus();
    this.renderAnalyticsResolution();
    this.renderAnalyticsCat();
    this.renderAnalyticsSLA();
  },

  renderAnalyticsStatus() {
    const el = document.getElementById('analyticsStatusChart');
    if (!el) return;
    const counts = {};
    STATUSES.forEach(s => counts[s] = this.tickets.filter(t => t.status === s).length);
    const max = Math.max(...Object.values(counts), 1);
    el.innerHTML = `<div class="bar-chart">${STATUSES.map(s => {
      const n = counts[s];
      return `<div class="bar-group">
        <div class="bar-wrap">
          <span class="bar-value">${n}</span>
          <div class="bar" style="height:${Math.max((n/max)*150,4)}px;background:${STATUS_COLORS[s]}"></div>
        </div>
        <span class="bar-label">${s.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')}</span>
      </div>`;}).join('')}</div>`;
  },

  renderAnalyticsResolution() {
    const el = document.getElementById('analyticsResChart');
    if (!el) return;
    const total    = this.tickets.length;
    const resolved = this.tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    const rate     = total ? Math.round((resolved / total) * 100) : 0;
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:180px;gap:8px">
        <svg width="140" height="140" viewBox="0 0 140 140" style="transform:rotate(-90deg)">
          <circle cx="70" cy="70" r="55" fill="none" stroke="var(--bg-elevated)" stroke-width="20"/>
          <circle cx="70" cy="70" r="55" fill="none" stroke="#10b981" stroke-width="20"
            stroke-dasharray="${(rate/100)*345.4} 345.4" style="transition:stroke-dasharray .6s ease"/>
        </svg>
        <div style="font-size:32px;font-weight:800;color:#10b981;margin-top:-150px;position:relative;z-index:1">${rate}%</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:130px">Resolution Rate</div>
        <div style="font-size:12px;color:var(--text-secondary)">${resolved} of ${total} tickets resolved</div>
      </div>`;
  },

  renderAnalyticsCat() {
    const el = document.getElementById('analyticsCatChart');
    if (!el) return;
    const counts = {};
    this.tickets.forEach(t => counts[t.category] = (counts[t.category]||0)+1);
    const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    const max = sorted[0]?.[1] || 1;
    const colors = ['#6366f1','#a855f7','#3b82f6','#14b8a6','#f59e0b','#f97316','#ef4444'];
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;padding-top:8px">
      ${sorted.map(([cat,n],i)=>`
        <div style="display:flex;align-items:center;gap:10px;font-size:13px">
          <span style="width:110px;color:var(--text-secondary);flex-shrink:0">${categoryLabel(cat)}</span>
          <div style="flex:1;height:10px;background:var(--bg-elevated);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${(n/max)*100}%;background:${colors[i%colors.length]};border-radius:99px;transition:width .5s ease"></div>
          </div>
          <span style="width:20px;text-align:right;font-weight:600">${n}</span>
        </div>`).join('')}
    </div>`;
  },

  renderAnalyticsSLA() {
    const el = document.getElementById('analyticsSlaChart');
    if (!el) return;
    const slaTimes = SLA_SETTINGS;
    const results = PRIORITIES.map(p => {
      const resolved = this.tickets.filter(t => t.priority === p && (t.status==='resolved'||t.status==='closed'));
      if (!resolved.length) return { p, met: 0, total: 0, pct: 0 };
      const slaHrs = slaTimes[p];
      const met = resolved.filter(t => {
        const hrs = (new Date(t.updated) - new Date(t.created)) / 3600000;
        return hrs <= slaHrs;
      }).length;
      return { p, met, total: resolved.length, pct: Math.round((met/resolved.length)*100) };
    });
    const pColors = { critical:'#ef4444', high:'#f97316', medium:'#f59e0b', low:'#64748b' };
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:14px;padding-top:8px">
      ${results.map(r=>`
        <div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
            <span>${r.p.charAt(0).toUpperCase()+r.p.slice(1)}</span>
            <span style="color:${r.pct>=80?'#10b981':r.pct>=50?'#f59e0b':'#ef4444'};font-weight:600">${r.pct}%</span>
          </div>
          <div style="height:8px;background:var(--bg-elevated);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${r.pct}%;background:${pColors[r.p]};border-radius:99px;transition:width .5s ease"></div>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${r.met}/${r.total} within SLA</div>
        </div>`).join('')}
    </div>`;
  },

  // ══════════════════════════════════════════════
  //   EXPORT CSV
  // ══════════════════════════════════════════════
  exportCSV() {
    const headers = ['ID','Company','Contact Name','Email','Phone','Subject','Category','Priority','Status','Assignee','Submitter','Asset','Created','Updated'];
    const rows = this.tickets.map(t => [
      t.id, `"${(t.company||'').replace(/"/g,'""')}"`, `"${(t.contactName||'').replace(/"/g,'""')}"`, t.email||'', t.phone||'',
      `"${t.subject.replace(/"/g,'""')}"`, categoryLabel(t.category),
      t.priority, t.status, agentName(t.assignee), t.submitter, t.asset || '',
      fmtDate(t.created), fmtDate(t.updated)
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `helpdesk-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    Toast.show('CSV exported successfully', 'success');
  },
};

// ── Helper: is today
function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso), now = new Date();
  return d.getDate()===now.getDate() && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
}

// ── Boot
document.addEventListener('DOMContentLoaded', () => app.init());

window.app = app;
