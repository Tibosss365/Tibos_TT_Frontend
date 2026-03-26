import pathlib

part2 = r"""

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
  tickets: [],
  notifications: [],
  currentView: 'dashboard',
  openTicketId: null,
  selectedTickets: new Set(),
  attachedFiles: [],

  init() {
    const saved = store.loadTickets();
    this.tickets = saved || JSON.parse(JSON.stringify(SEED_TICKETS));
    if (!saved) store.saveTickets(this.tickets);
    this.notifications = store.loadNotifs();
    const settings = store.loadSettings();
    if (settings.theme) document.documentElement.setAttribute('data-theme', settings.theme);
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

  setupUser() {
    document.getElementById('userDisplayName').textContent = CURRENT_USER.name;
    document.getElementById('userAvatar').textContent      = CURRENT_USER.initials;
    document.getElementById('topbarAvatar').textContent   = CURRENT_USER.initials;
    document.getElementById('topbarName').textContent     = CURRENT_USER.name;
    document.getElementById('dashGreetName').textContent  = CURRENT_USER.name.split(' ')[0];
  },

  setupSidebar() {
    const sidebar   = document.getElementById('sidebar');
    const toggle    = document.getElementById('sidebarToggle');
    const overlay   = document.getElementById('sidebarOverlay');
    const mobileBtn = document.getElementById('mobileMenuBtn');
    toggle?.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    mobileBtn?.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      overlay.style.display = sidebar.classList.contains('mobile-open') ? 'block' : 'none';
    });
    overlay?.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.style.display = 'none';
    });
    document.querySelectorAll('.nav-link[data-view]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        this.navigate(link.dataset.view);
        if (window.innerWidth <= 768) { sidebar.classList.remove('mobile-open'); overlay.style.display = 'none'; }
      });
    });
  },

  setupTopbar() {
    document.getElementById('notificationBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      document.getElementById('notifPanel').classList.toggle('hidden');
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('#notifPanel') && !e.target.closest('#notificationBtn'))
        document.getElementById('notifPanel')?.classList.add('hidden');
    });
  },

  setupTheme() {
    document.getElementById('themeToggle')?.addEventListener('click', () => {
      const curr = document.documentElement.getAttribute('data-theme');
      const next = curr === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      const s = store.loadSettings(); s.theme = next; store.saveSettings(s);
    });
  },

  setupNotifications() { this.renderNotifications(); },

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
    list.innerHTML = this.notifications.length
      ? this.notifications.map(n => `<div class="notif-item"><div class="notif-item-text">${escHTML(n.text)}</div><div class="notif-item-time">${timeAgo(n.ts)}</div></div>`).join('')
      : '<div class="notif-empty">No notifications</div>';
  },

  navigate(view) {
    this.currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${view}`)?.classList.remove('hidden');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`nav-${view}`)?.classList.add('active');
    this.updateBadges();
    const map = { dashboard: () => this.renderDashboard(), 'my-tickets': () => this.renderMyTickets(),
      'all-tickets': () => this.renderAllTickets(), admin: () => this.renderAdmin(),
      analytics: () => this.renderAnalytics(), 'new-ticket': () => this.resetNewTicketForm() };
    map[view]?.();
  },

  updateBadges() {
    const open = this.tickets.filter(t => t.status === 'open' || t.status === 'in-progress');
    document.getElementById('myTicketsBadge').textContent = open.filter(t => t.submitter === CURRENT_USER.name).length || '';
    document.getElementById('allTicketsBadge').textContent = open.length || '';
  },

  // ── Dashboard ────────────────────────────────
  renderDashboard() {
    const t = this.tickets;
    const open    = t.filter(x => x.status === 'open').length;
    const inprog  = t.filter(x => x.status === 'in-progress').length;
    const resTd   = t.filter(x => x.status === 'resolved' && isToday(x.updated)).length;
    const crit    = t.filter(x => x.priority === 'critical' && x.status !== 'closed' && x.status !== 'resolved').length;
    document.getElementById('stat-open').textContent       = open;
    document.getElementById('stat-inprogress').textContent = inprog;
    document.getElementById('stat-resolved').textContent   = resTd;
    document.getElementById('stat-critical').textContent   = crit;
    document.getElementById('stat-total').textContent      = t.length;
    document.getElementById('stat-avg-resp').textContent   = '2.4';
    document.getElementById('stat-open-delta').textContent       = `${open} active`;
    document.getElementById('stat-inprogress-delta').textContent = `${inprog} in queue`;
    document.getElementById('stat-resolved-delta').textContent   = 'today';
    document.getElementById('stat-critical-delta').textContent   = crit > 0 ? 'needs attention' : 'clear';
    document.getElementById('stat-total-delta').textContent      = 'all time';
    document.getElementById('stat-avg-resp-delta').textContent   = 'avg hours';
    this.renderCategoryChart();
    this.renderPriorityChart();
    this.renderRecentTickets();
    this.renderActivityFeed();
  },

  renderCategoryChart() {
    const el = document.getElementById('categoryChart'); if (!el) return;
    const counts = {};
    this.tickets.forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1; });
    const max = Math.max(...Object.values(counts), 1);
    const colors = { hardware:'#3b82f6', software:'#a855f7', network:'#14b8a6', access:'#f59e0b', email:'#f97316', security:'#ef4444', other:'#64748b' };
    el.innerHTML = `<div class="bar-chart">${Object.entries(counts).map(([cat, n]) => `
      <div class="bar-group"><div class="bar-wrap">
        <span class="bar-value">${n}</span>
        <div class="bar" style="height:${Math.max((n/max)*140,4)}px;background:${colors[cat]||'#6366f1'}"></div>
      </div><span class="bar-label">${categoryLabel(cat)}</span></div>`).join('')}</div>`;
  },

  renderPriorityChart() {
    const el = document.getElementById('priorityChart'); if (!el) return;
    const counts = { critical:0, high:0, medium:0, low:0 };
    this.tickets.forEach(t => { if (counts[t.priority] !== undefined) counts[t.priority]++; });
    const total = Object.values(counts).reduce((a,b) => a+b, 0) || 1;
    const colors = { critical:'#ef4444', high:'#f97316', medium:'#f59e0b', low:'#64748b' };
    const r = 60, cx = 70, cy = 70, circ = 2 * Math.PI * r;
    let offset = 0;
    const slices = Object.entries(counts).map(([p, n]) => {
      const dash = (n/total) * circ;
      const sl = { p, n, dash, offset };
      offset += dash; return sl;
    });
    el.innerHTML = `<div class="donut-area">
      <div class="donut-svg-wrap"><svg width="140" height="140" style="transform:rotate(-90deg)">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--bg-elevated)" stroke-width="26"/>
        ${slices.map(s => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[s.p]}"
          stroke-width="26" stroke-dasharray="${s.dash} ${circ - s.dash}" stroke-dashoffset="${-s.offset}"/>`).join('')}
      </svg></div>
      <div class="donut-legend">${slices.map(s => `
        <div class="donut-legend-item">
          <span class="donut-dot" style="background:${colors[s.p]}"></span>
          <span>${s.p.charAt(0).toUpperCase()+s.p.slice(1)}: <strong>${s.n}</strong></span>
        </div>`).join('')}
      </div></div>`;
  },

  renderRecentTickets() {
    const el = document.getElementById('recentTicketsList'); if (!el) return;
    const recent = [...this.tickets].sort((a,b) => new Date(b.updated) - new Date(a.updated)).slice(0,8);
    el.innerHTML = recent.map(t => `<div class="recent-item" onclick="app.openTicket('${t.id}')">
      <span class="recent-item-id">${t.id}</span>
      <span class="recent-item-subject">${escHTML(t.subject)}</span>
      ${priorityBadge(t.priority)} ${statusBadge(t.status)}
      <span class="recent-item-meta">${timeAgo(t.updated)}</span>
    </div>`).join('');
  },

  renderActivityFeed() {
    const el = document.getElementById('activityFeed'); if (!el) return;
    const dotColors = { created:'#6366f1', assign:'#f59e0b', status:'#14b8a6', comment:'#3b82f6', resolved:'#10b981' };
    const events = [];
    this.tickets.forEach(t => (t.timeline||[]).forEach(ev => events.push({ ...ev, ticketId:t.id })));
    events.sort((a,b) => new Date(b.ts) - new Date(a.ts));
    el.innerHTML = events.slice(0,10).map(ev => `<div class="activity-item">
      <div class="activity-dot" style="background:${dotColors[ev.type]||'#6366f1'}"></div>
      <div class="activity-content">
        <div class="activity-text"><a href="#" onclick="app.openTicket('${ev.ticketId}');return false" style="color:var(--accent)">${ev.ticketId}</a> — ${ev.text}</div>
        <div class="activity-time">${timeAgo(ev.ts)}</div>
      </div></div>`).join('');
  },

  // ── Ticket Table ─────────────────────────────
  renderTicketTable(tickets, containerId) {
    const el = document.getElementById(containerId); if (!el) return;
    if (!tickets.length) {
      el.innerHTML = `<div class="ticket-table-wrap"><div class="table-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
        <h3>No tickets found</h3><p>Try adjusting your filters</p></div></div>`; return;
    }
    el.innerHTML = `<div class="ticket-table-wrap"><table class="ticket-table">
      <thead><tr>
        <th class="col-check"><input type="checkbox" id="checkAll" onchange="app.toggleCheckAll(this)"></th>
        <th class="col-id">ID</th><th>Subject</th><th class="col-pri">Priority</th>
        <th class="col-status">Status</th><th class="col-cat">Category</th>
        <th class="col-agent">Assignee</th><th class="col-date">Updated</th>
      </tr></thead>
      <tbody>${tickets.map(t => `<tr onclick="app.openTicket('${t.id}')" data-id="${t.id}">
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
      </tr>`).join('')}</tbody></table></div>`;
  },

  renderMyTickets()  { this.renderTicketTable(this.tickets.filter(t => t.submitter === CURRENT_USER.name), 'myTicketsContent'); },
  renderAllTickets() { this.renderTicketTable(this.getFilteredTickets(), 'allTicketsContent'); },

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
    if (search)   list = list.filter(t => t.subject.toLowerCase().includes(search) || t.id.toLowerCase().includes(search) || t.submitter.toLowerCase().includes(search));
    const sortFns = { newest:(a,b)=>new Date(b.created)-new Date(a.created), oldest:(a,b)=>new Date(a.created)-new Date(b.created), updated:(a,b)=>new Date(b.updated)-new Date(a.updated), priority:(a,b)=>PRIORITIES.indexOf(a.priority)-PRIORITIES.indexOf(b.priority) };
    list.sort(sortFns[sort]||sortFns.newest);
    return list;
  },

  setupFilters() {
    ['filterStatus','filterPriority','filterCategory','filterSort','ticketSearch'].forEach(id => {
      document.getElementById(id)?.addEventListener('input',  () => this.currentView==='all-tickets' && this.renderAllTickets());
      document.getElementById(id)?.addEventListener('change', () => this.currentView==='all-tickets' && this.renderAllTickets());
    });
  },

  setupGlobalSearch() {
    document.getElementById('globalSearch')?.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const q = e.target.value.trim(); if (!q) return;
      this.navigate('all-tickets');
      const s = document.getElementById('ticketSearch'); if (s) s.value = q;
      this.renderAllTickets(); e.target.value = '';
    });
    document.addEventListener('keydown', e => { if ((e.metaKey||e.ctrlKey)&&e.key==='k') { e.preventDefault(); document.getElementById('globalSearch')?.focus(); } });
  },

  toggleCheck(el, id) {
    if (el.checked) this.selectedTickets.add(id); else this.selectedTickets.delete(id);
    el.closest('tr')?.classList.toggle('selected', el.checked);
  },
  toggleCheckAll(el) {
    document.querySelectorAll('input[data-id]').forEach(cb => {
      cb.checked = el.checked;
      el.checked ? this.selectedTickets.add(cb.dataset.id) : this.selectedTickets.delete(cb.dataset.id);
      cb.closest('tr')?.classList.toggle('selected', el.checked);
    });
  },
  selectAllTickets() { this.tickets.forEach(t => this.selectedTickets.add(t.id)); this.renderAllTickets(); },

  // ── Modal ────────────────────────────────────
  setupModal() {
    document.getElementById('modalClose')?.addEventListener('click',      () => this.closeModal());
    document.getElementById('ticketModal')?.addEventListener('click',     e => { if (e.target===e.currentTarget) this.closeModal(); });
    document.getElementById('saveTicketBtn')?.addEventListener('click',   () => this.saveTicketChanges());
    document.getElementById('deleteTicketBtn')?.addEventListener('click', () => this.deleteTicket());
    document.getElementById('addCommentBtn')?.addEventListener('click',   () => this.addComment());
    document.addEventListener('keydown', e => { if (e.key==='Escape') this.closeModal(); });
  },

  openTicket(id) {
    const t = this.tickets.find(x => x.id===id); if (!t) return;
    this.openTicketId = id;
    document.getElementById('modalTicketId').textContent  = t.id;
    document.getElementById('modalSubject').textContent   = t.subject;
    document.getElementById('modalDescription').textContent = t.description;
    document.getElementById('modalCategory').textContent  = categoryLabel(t.category);
    document.getElementById('modalSubmitter').textContent = t.submitter;
    document.getElementById('modalCreated').textContent   = fmtDateTIME(t.created);
    document.getElementById('modalUpdated').textContent   = fmtDateTIME(t.updated);
    document.getElementById('modalAsset').textContent     = t.asset || '—';
    document.getElementById('modalMetaRow').innerHTML     = `${priorityBadge(t.priority)} ${statusBadge(t.status)} <span class="badge" style="background:var(--bg-elevated);color:var(--text-secondary)">${categoryLabel(t.category)}</span>`;
    document.getElementById('modalStatus').innerHTML      = STATUSES.map(s => `<option value="${s}" ${t.status===s?'selected':''}>${s.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')}</option>`).join('');
    document.getElementById('modalPriority').value        = t.priority;
    document.getElementById('modalAssignee').innerHTML    = AGENTS.map(a => `<option value="${a.id}" ${t.assignee===a.id?'selected':''}>${a.name}</option>`).join('');
    this.renderTimeline(t);
    document.getElementById('commentInput').value = '';
    document.getElementById('ticketModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  },

  renderTimeline(t) {
    const el = document.getElementById('modalTimeline'); if (!el) return;
    const col = { created:'#6366f1', assign:'#f59e0b', status:'#14b8a6', comment:'#3b82f6', resolved:'#10b981' };
    el.innerHTML = (t.timeline||[]).map(ev => `<div class="timeline-item">
      <div class="timeline-line-wrap">
        <div class="timeline-dot" style="background:${col[ev.type]||'#6366f1'}"></div>
        <div class="timeline-vline"></div>
      </div>
      <div class="timeline-body">
        <div class="timeline-action">${ev.text}</div>
        ${ev.type==='comment'&&ev.author ? `<div class="timeline-comment">${escHTML(ev.text)}</div>` : ''}
        <div class="timeline-ts">${fmtDateTIME(ev.ts)} &middot; ${timeAgo(ev.ts)}</div>
      </div></div>`).join('');
  },

  closeModal() {
    document.getElementById('ticketModal').classList.add('hidden');
    document.body.style.overflow = '';
    this.openTicketId = null;
  },

  saveTicketChanges() {
    const t = this.tickets.find(x => x.id===this.openTicketId); if (!t) return;
    const newStatus   = document.getElementById('modalStatus').value;
    const newPriority = document.getElementById('modalPriority').value;
    const newAssignee = document.getElementById('modalAssignee').value;
    const changes = [];
    if (newStatus!==t.status)     changes.push({ type:'status', text:`Status changed to <strong>${newStatus.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')}</strong>`, ts:new Date().toISOString() });
    if (newPriority!==t.priority) changes.push({ type:'status', text:`Priority changed to <strong>${newPriority}</strong>`, ts:new Date().toISOString() });
    if (newAssignee!==t.assignee) changes.push({ type:'assign', text:`Reassigned to <strong>${agentName(newAssignee)}</strong>`, ts:new Date().toISOString() });
    t.status=newStatus; t.priority=newPriority; t.assignee=newAssignee;
    t.updated=new Date().toISOString(); t.timeline=[...(t.timeline||[]),...changes];
    store.saveTickets(this.tickets);
    changes.forEach(c => this.addNotification(`${t.id}: ${c.text.replace(/<[^>]+>/g,'')}`));
    this.closeModal(); this.navigate(this.currentView);
    Toast.show('Ticket updated successfully', 'success');
  },

  deleteTicket() {
    if (!confirm('Delete this ticket? This cannot be undone.')) return;
    this.tickets = this.tickets.filter(t => t.id!==this.openTicketId);
    store.saveTickets(this.tickets);
    this.closeModal(); this.navigate(this.currentView);
    Toast.show('Ticket deleted', 'info');
  },

  addComment() {
    const input = document.getElementById('commentInput');
    const text  = input.value.trim();
    if (!text) { Toast.show('Please enter a comment', 'warning'); return; }
    const t = this.tickets.find(x => x.id===this.openTicketId); if (!t) return;
    const ev = { type:'comment', text:escHTML(text), author:CURRENT_USER.name, ts:new Date().toISOString() };
    t.timeline.push(ev); t.updated=ev.ts;
    store.saveTickets(this.tickets); input.value='';
    this.renderTimeline(t);
    this.addNotification(`New comment on ${t.id} by ${CURRENT_USER.name}`);
    Toast.show('Comment posted', 'success');
  },

  // ── New Ticket Form ──────────────────────────
  setupNewTicketForm() {
    const desc = document.getElementById('ticketDescription');
    desc?.addEventListener('input', () => {
      const n = desc.value.length;
      document.getElementById('descCharCount').textContent = `${n} / 2000`;
      if (n>2000) desc.value = desc.value.slice(0,2000);
    });
    const fileInput = document.getElementById('fileInput');
    const fileDrop  = document.getElementById('fileDrop');
    fileInput?.addEventListener('change', () => this.handleFiles(fileInput.files));
    fileDrop?.addEventListener('dragover', e => { e.preventDefault(); fileDrop.style.borderColor='var(--accent)'; });
    fileDrop?.addEventListener('dragleave', () => { fileDrop.style.borderColor=''; });
    fileDrop?.addEventListener('drop', e => { e.preventDefault(); fileDrop.style.borderColor=''; this.handleFiles(e.dataTransfer.files); });
    document.getElementById('newTicketForm')?.addEventListener('submit', e => { e.preventDefault(); this.submitTicket(); });
  },

  handleFiles(files) {
    Array.from(files).forEach(f => this.attachedFiles.push(f.name));
    const list = document.getElementById('fileList');
    if (list) list.innerHTML = this.attachedFiles.map(n => `<div class="file-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/></svg>${escHTML(n)}</div>`).join('');
  },

  resetNewTicketForm() {
    document.getElementById('newTicketForm')?.reset();
    document.getElementById('descCharCount').textContent='0 / 2000';
    document.getElementById('fileList').innerHTML='';
    this.attachedFiles=[];
    ['subjectError','categoryError','descError'].forEach(id => { const e=document.getElementById(id); if(e) e.textContent=''; });
  },

  submitTicket() {
    const subject  = document.getElementById('ticketSubject').value.trim();
    const category = document.getElementById('ticketCategory').value;
    const desc     = document.getElementById('ticketDescription').value.trim();
    const priority = document.querySelector('input[name="priority"]:checked')?.value||'medium';
    const asset    = document.getElementById('ticketAsset').value.trim();
    let valid=true;
    if (!subject)       { document.getElementById('subjectError').textContent='Subject is required'; valid=false; } else document.getElementById('subjectError').textContent='';
    if (!category)      { document.getElementById('categoryError').textContent='Please select a category'; valid=false; } else document.getElementById('categoryError').textContent='';
    if (desc.length<10) { document.getElementById('descError').textContent='Description must be at least 10 characters'; valid=false; } else document.getElementById('descError').textContent='';
    if (!valid) return;
    const now=new Date().toISOString();
    const ticket={ id:genId(this.tickets), subject, category, priority, status:'open', assignee:'unassigned', submitter:CURRENT_USER.name, asset, description:desc, created:now, updated:now,
      timeline:[{ type:'created', text:`Ticket submitted by <strong>${escHTML(CURRENT_USER.name)}</strong>`, ts:now }] };
    this.tickets.unshift(ticket);
    store.saveTickets(this.tickets);
    this.addNotification(`New ticket ${ticket.id}: ${ticket.subject}`);
    Toast.show(`Ticket ${ticket.id} submitted!`, 'success');
    this.navigate('my-tickets');
  },

  // ── Admin ────────────────────────────────────
  renderAdmin() {
    const unassigned = this.tickets.filter(t => t.assignee==='unassigned' && t.status!=='closed' && t.status!=='resolved');
    const el = document.getElementById('unassignedList');
    if (el) el.innerHTML = unassigned.length
      ? unassigned.map(t => `<div class="recent-item" onclick="app.openTicket('${t.id}')"><span class="recent-item-id">${t.id}</span><span class="recent-item-subject">${escHTML(t.subject)}</span>${priorityBadge(t.priority)}</div>`).join('')
      : '<div class="table-empty" style="padding:1rem"><p>No unassigned tickets</p></div>';
    const workload=document.getElementById('agentWorkload');
    if (workload) {
      const maxLoad=Math.max(...AGENTS.filter(a=>a.id!=='unassigned').map(a=>this.tickets.filter(t=>t.assignee===a.id&&t.status!=='closed').length),1);
      workload.innerHTML=AGENTS.filter(a=>a.id!=='unassigned').map(a=>{
        const count=this.tickets.filter(t=>t.assignee===a.id&&t.status!=='closed').length;
        return `<div class="agent-row"><div class="user-avatar sm">${a.initials}</div><span class="agent-name">${a.name}</span><div class="agent-bar-wrap"><div class="agent-bar" style="width:${(count/maxLoad)*100}%"></div></div><span class="agent-count">${count} tickets</span></div>`;
      }).join('');
    }
  },

  applyBulkAction() {
    const action=document.getElementById('bulkAction').value;
    if (!action) { Toast.show('Select an action first','warning'); return; }
    if (!this.selectedTickets.size) { Toast.show('Select at least one ticket','warning'); return; }
    if (action==='delete'&&!confirm(`Delete ${this.selectedTickets.size} ticket(s)?`)) return;
    const count=this.selectedTickets.size;
    this.selectedTickets.forEach(id => {
      if (action==='delete') { this.tickets=this.tickets.filter(t=>t.id!==id); }
      else { const t=this.tickets.find(x=>x.id===id); if(t){ t.status=action==='resolve'?'resolved':'closed'; t.updated=new Date().toISOString(); } }
    });
    this.selectedTickets.clear();
    store.saveTickets(this.tickets);
    Toast.show(`Bulk action applied to ${count} ticket(s)`,'success');
    this.renderAdmin();
  },

  resetData() {
    if (!confirm('Restore demo data? All current tickets will be lost.')) return;
    this.tickets=JSON.parse(JSON.stringify(SEED_TICKETS));
    store.saveTickets(this.tickets);
    this.notifications=[]; store.saveNotifs([]);
    Toast.show('Demo data restored','info');
    this.navigate('dashboard');
  },

  // ── Analytics ────────────────────────────────
  renderAnalytics() {
    this.renderAnalyticsStatus();
    this.renderAnalyticsResolution();
    this.renderAnalyticsCat();
    this.renderAnalyticsSLA();
  },

  renderAnalyticsStatus() {
    const el=document.getElementById('analyticsStatusChart'); if(!el) return;
    const counts={}; STATUSES.forEach(s=>counts[s]=this.tickets.filter(t=>t.status===s).length);
    const max=Math.max(...Object.values(counts),1);
    el.innerHTML=`<div class="bar-chart">${STATUSES.map(s=>`<div class="bar-group"><div class="bar-wrap"><span class="bar-value">${counts[s]}</span><div class="bar" style="height:${Math.max((counts[s]/max)*150,4)}px;background:${STATUS_COLORS[s]}"></div></div><span class="bar-label">${s.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')}</span></div>`).join('')}</div>`;
  },

  renderAnalyticsResolution() {
    const el=document.getElementById('analyticsResChart'); if(!el) return;
    const total=this.tickets.length;
    const resolved=this.tickets.filter(t=>t.status==='resolved'||t.status==='closed').length;
    const rate=total?Math.round((resolved/total)*100):0;
    el.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:180px;gap:4px;position:relative">
      <svg width="140" height="140" style="transform:rotate(-90deg)"><circle cx="70" cy="70" r="55" fill="none" stroke="var(--bg-elevated)" stroke-width="20"/><circle cx="70" cy="70" r="55" fill="none" stroke="#10b981" stroke-width="20" stroke-dasharray="${(rate/100)*345.4} 345.4"/></svg>
      <div style="position:absolute;font-size:28px;font-weight:800;color:#10b981">${rate}%</div>
      <div style="font-size:13px;color:var(--text-muted);margin-top:8px">Resolution Rate</div>
      <div style="font-size:12px;color:var(--text-secondary)">${resolved} of ${total} tickets</div></div>`;
  },

  renderAnalyticsCat() {
    const el=document.getElementById('analyticsCatChart'); if(!el) return;
    const counts={};
    this.tickets.forEach(t=>counts[t.category]=(counts[t.category]||0)+1);
    const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    const max=sorted[0]?.[1]||1;
    const cols=['#6366f1','#a855f7','#3b82f6','#14b8a6','#f59e0b','#f97316','#ef4444'];
    el.innerHTML=`<div style="display:flex;flex-direction:column;gap:10px;padding-top:8px">
      ${sorted.map(([cat,n],i)=>`<div style="display:flex;align-items:center;gap:10px;font-size:13px">
        <span style="width:120px;color:var(--text-secondary);flex-shrink:0">${categoryLabel(cat)}</span>
        <div style="flex:1;height:10px;background:var(--bg-elevated);border-radius:99px;overflow:hidden"><div style="height:100%;width:${(n/max)*100}%;background:${cols[i%cols.length]};border-radius:99px"></div></div>
        <span style="width:20px;text-align:right;font-weight:600">${n}</span></div>`).join('')}</div>`;
  },

  renderAnalyticsSLA() {
    const el=document.getElementById('analyticsSlaChart'); if(!el) return;
    const slaTimes={critical:1,high:4,medium:8,low:24};
    const pColors={critical:'#ef4444',high:'#f97316',medium:'#f59e0b',low:'#64748b'};
    const results=PRIORITIES.map(p=>{
      const res=this.tickets.filter(t=>t.priority===p&&(t.status==='resolved'||t.status==='closed'));
      if(!res.length) return{p,met:0,total:0,pct:0};
      const met=res.filter(t=>(new Date(t.updated)-new Date(t.created))/3600000<=slaTimes[p]).length;
      return{p,met,total:res.length,pct:Math.round((met/res.length)*100)};
    });
    el.innerHTML=`<div style="display:flex;flex-direction:column;gap:14px;padding-top:8px">
      ${results.map(r=>`<div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span>${r.p.charAt(0).toUpperCase()+r.p.slice(1)}</span><span style="color:${r.pct>=80?'#10b981':r.pct>=50?'#f59e0b':'#ef4444'};font-weight:600">${r.pct}%</span></div>
        <div style="height:8px;background:var(--bg-elevated);border-radius:99px;overflow:hidden"><div style="height:100%;width:${r.pct}%;background:${pColors[r.p]};border-radius:99px"></div></div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${r.met}/${r.total} within SLA</div>
      </div>`).join('')}</div>`;
  },

  exportCSV() {
    const rows=this.tickets.map(t=>[t.id,`"${t.subject.replace(/"/g,'""')}"`,categoryLabel(t.category),t.priority,t.status,agentName(t.assignee),t.submitter,t.asset||'',fmtDate(t.created),fmtDate(t.updated)].join(','));
    const csv=[['ID','Subject','Category','Priority','Status','Assignee','Submitter','Asset','Created','Updated'].join(','),...rows].join('\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`helpdesk-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); Toast.show('CSV exported','success');
  },
};

function isToday(iso) {
  if (!iso) return false;
  const d=new Date(iso),n=new Date();
  return d.getDate()===n.getDate()&&d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();
}

document.addEventListener('DOMContentLoaded', () => app.init());
"""

target = pathlib.Path(r"c:\Users\DanielVenkat\.gemini\antigravity\scratch\it-support-ticketing\app.js")
current = target.read_text(encoding='utf-8')

# Only append if this part hasn't been added yet
if 'app.init()' not in current:
    with target.open('a', encoding='utf-8') as f:
        f.write(part2)
    print("Part 2 appended successfully.")
else:
    print("Part 2 already present, skipping.")

print(f"Final line count: {len(target.read_text(encoding='utf-8').splitlines())}")
