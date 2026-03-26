import pathlib
import sys

# 1. Read app.js
file_path = pathlib.Path(r"c:\Users\DanielVenkat\.gemini\antigravity\scratch\it-support-ticketing\app.js")
content = file_path.read_text(encoding='utf-8')

# 2. Patch top level declarations (AGENTS -> let AGENTS, add default SLA/Email)
top_level_orig = """const AGENTS = [
  { id: 'a1', name: 'Sarah Chen',    initials: 'SC' },
  { id: 'a2', name: 'Marcus Webb',   initials: 'MW' },
  { id: 'a3', name: 'Priya Nair',    initials: 'PN' },
  { id: 'a4', name: 'Tom Bradley',   initials: 'TB' },
  { id: 'unassigned', name: 'Unassigned', initials: '—' },
];"""

top_level_new = """let AGENTS = [];
const DEFAULT_AGENTS = [
  { id: 'a1', name: 'Sarah Chen',    initials: 'SC', group: 'Security' },
  { id: 'a2', name: 'Marcus Webb',   initials: 'MW', group: 'Network' },
  { id: 'a3', name: 'Priya Nair',    initials: 'PN', group: 'L1 Support' },
  { id: 'a4', name: 'Tom Bradley',   initials: 'TB', group: 'Application' },
  { id: 'unassigned', name: 'Unassigned', initials: '—', group: '—' },
];

let SLA_SETTINGS = { critical: 1, high: 4, medium: 8, low: 24 };
let EMAIL_TRIGGERS = { new: false, assign: false, resolve: false };
"""

if top_level_orig in content:
    content = content.replace(top_level_orig, top_level_new)

# 3. Patch app.init to load the new settings
init_orig = """    const settings = store.loadSettings();
    if (settings.theme) document.documentElement.setAttribute('data-theme', settings.theme);"""

init_new = """    const settings = store.loadSettings();
    if (settings.theme) document.documentElement.setAttribute('data-theme', settings.theme);
    
    // Load Admin Settings
    AGENTS = settings.agents || JSON.parse(JSON.stringify(DEFAULT_AGENTS));
    SLA_SETTINGS = settings.sla || SLA_SETTINGS;
    EMAIL_TRIGGERS = settings.emailTriggers || EMAIL_TRIGGERS;
    if (!settings.agents) {
        settings.agents = AGENTS;
        store.saveSettings(settings);
    }"""

if init_orig in content:
    content = content.replace(init_orig, init_new)


# 4. Add the triggerEmail function inside app object
trigger_email_func = """
  triggerEmail(triggerName, ticket, extra = '') {
    if (!EMAIL_TRIGGERS[triggerName]) return;
    let msg = '';
    if (triggerName === 'new') msg = `[Email Sent] To: Submitters & Tech Group — Re: New Ticket ${ticket.id}`;
    if (triggerName === 'assign') msg = `[Email Sent] To: ${agentName(ticket.assignee)} — Re: Assigned Ticket ${ticket.id}`;
    if (triggerName === 'resolve') msg = `[Email Sent] To: ${ticket.submitter} — Re: Ticket ${ticket.id} ${ticket.status}`;
    Toast.show(msg, 'success');
    this.addNotification(msg);
  },
"""

if 'triggerEmail(' not in content:
    content = content.replace("  addNotification(text) {", trigger_email_func + "\n  addNotification(text) {")


# 5. Hook triggers into ticket submission, assignment, and status changes
# Submit tickt
submit_hook_orig = "Toast.show(`Ticket ${ticket.id} submitted successfully!`, 'success');"
submit_hook_new = """Toast.show(`Ticket ${ticket.id} submitted successfully!`, 'success');
    this.triggerEmail('new', ticket);"""
if submit_hook_orig in content:
    content = content.replace(submit_hook_orig, submit_hook_new)

# Update ticket
save_hook_orig = "Toast.show('Ticket updated successfully', 'success');"
save_hook_new = """Toast.show('Ticket updated successfully', 'success');
    if (newAssignee !== t.assignee && newAssignee !== 'unassigned') this.triggerEmail('assign', t);
    if ((newStatus === 'resolved' || newStatus === 'closed') && newStatus !== t.status) this.triggerEmail('resolve', t);"""
if save_hook_orig in content:
    content = content.replace(save_hook_orig, save_hook_new)


# Bulk Action
bulk_hook_orig = " Toast.show(`Bulk action applied to ${this.selectedTickets.size || 'selected'} tickets`, 'success');"
bulk_hook_new = """ Toast.show(`Bulk action applied to selected tickets`, 'success');
    if (action === 'resolve' || action === 'close') {
      this.selectedTickets.forEach(id => {
         const t = this.tickets.find(x => x.id === id);
         if (t) this.triggerEmail('resolve', t);
      });
    }"""
if bulk_hook_orig in content:
    content = content.replace(bulk_hook_orig, bulk_hook_new)


# 6. Replace `renderAdmin()` entirely and append the new Admin Tab logic

old_render_admin_block = """  renderAdmin() {
    const unassigned = this.tickets.filter(t => t.assignee === 'unassigned' && t.status !== 'closed' && t.status !== 'resolved');
    const el = document.getElementById('unassignedList');
    if (el) {
      el.innerHTML = unassigned.length
        ? unassigned.map(t => `
          <div class="recent-item" onclick="app.openTicket('${t.id}')">
            <span class="recent-item-id">${t.id}</span>
            <span class="recent-item-subject">${escHTML(t.subject)}</span>
            ${priorityBadge(t.priority)}
          </div>`).join('')
        : '<div class="table-empty" style="padding:1rem"><p>No unassigned tickets 🎉</p></div>';
    }

    const workload = document.getElementById('agentWorkload');
    if (workload) {
      const maxLoad = Math.max(...AGENTS.filter(a => a.id !== 'unassigned').map(a =>
        this.tickets.filter(t => t.assignee === a.id && t.status !== 'closed').length), 1);
      workload.innerHTML = AGENTS.filter(a => a.id !== 'unassigned').map(a => {
        const count = this.tickets.filter(t => t.assignee === a.id && t.status !== 'closed').length;
        return `<div class="agent-row">
          <div class="user-avatar sm">${a.initials}</div>
          <span class="agent-name">${a.name}</span>
          <div class="agent-bar-wrap"><div class="agent-bar" style="width:${(count/maxLoad)*100}%"></div></div>
          <span class="agent-count">${count} tickets</span>
        </div>`;
      }).join('');
    }
  },"""

new_render_admin_block = """  renderAdmin() {
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
    
    const newAgent = { id: newId, name, initials, group: groupInput.value };
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

  saveEmailSettings() {
    EMAIL_TRIGGERS['new'] = document.getElementById('email-trigger-new').checked;
    EMAIL_TRIGGERS['assign'] = document.getElementById('email-trigger-assign').checked;
    EMAIL_TRIGGERS['resolve'] = document.getElementById('email-trigger-resolve').checked;
    const s = store.loadSettings(); s.emailTriggers = EMAIL_TRIGGERS; store.saveSettings(s);
    Toast.show('Email triggers updated', 'success');
  },
"""

if old_render_admin_block in content:
    content = content.replace(old_render_admin_block, new_render_admin_block)


# 7. Update SLAs in Analytics to use SLA_SETTINGS instead of hardcoded
sla_analytics_orig = "const slaTimes = { critical:1, high:4, medium:8, low:24 };"
if sla_analytics_orig in content:
    content = content.replace(sla_analytics_orig, "const slaTimes = SLA_SETTINGS;")

# 8. Save
file_path.write_text(content, encoding='utf-8')
print("Successfully patched app.js")
