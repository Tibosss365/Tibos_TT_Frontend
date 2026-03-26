import pathlib

app_path = pathlib.Path(r"c:\Users\DanielVenkat\.gemini\antigravity\scratch\it-support-ticketing\app.js")
index_path = pathlib.Path(r"c:\Users\DanielVenkat\.gemini\antigravity\scratch\it-support-ticketing\index.html")
css_path = pathlib.Path(r"c:\Users\DanielVenkat\.gemini\antigravity\scratch\it-support-ticketing\styles.css")

# --- 1. Patch CSS ---
css = css_path.read_text(encoding='utf-8')
login_css = """
/* LOGIN PORTAL */
#view-login {
  display: flex !important;
  align-items: center;
  justify-content: center;
  background: var(--bg-main);
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 9999;
}
#view-login.hidden {
  display: none !important;
}
.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-elevated);
  padding: 2rem;
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  border: 1px solid var(--border);
}
.login-card h1 {
  text-align: center;
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
  color: var(--text-main);
}
.login-card p {
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}
.app-unlocked {
  display: flex !important;
}
.app-locked {
  display: none !important;
}
"""
if '#view-login' not in css:
    css += login_css
    css_path.write_text(css, encoding='utf-8')
    print("Patched styles.css")

# --- 2. Patch HTML ---
html = index_path.read_text(encoding='utf-8')

# A. Add Login View at the very beginning of the body
login_html = """
  <!-- LOGIN VIEW -->
  <section id="view-login" class="hidden">
    <div class="login-card">
      <div style="text-align:center; margin-bottom:1rem">
        <div class="logo-icon" style="margin: 0 auto; width: 48px; height: 48px; font-size:1.5rem">🎧</div>
      </div>
      <h1>HelpdeskPro Login</h1>
      <p>Please enter your credentials</p>
      <form id="loginForm" onsubmit="event.preventDefault(); app.login()">
        <div class="form-group">
          <label class="form-label">Username</label>
          <input type="text" id="loginUser" class="form-input" required>
        </div>
        <div class="form-group" style="margin-bottom: 1.5rem;">
          <label class="form-label">Password</label>
          <input type="password" id="loginPass" class="form-input" required>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center;">Sign In</button>
      </form>
    </div>
  </section>
"""
if 'view-login' not in html:
    html = html.replace('<body>', '<body>\n' + login_html)
    
    # B. Add Logout Button to sidebar
    logout_btn = """
        <nav class="nav-links">
          <a href="#" class="nav-link active" onclick="app.navigate('dashboard')" data-target="dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
          </a>
          <a href="#" class="nav-link" onclick="app.navigate('all-tickets')" data-target="all-tickets">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            All Tickets
          </a>
          <!-- Added Role Guard ID for Admin link -->
          <a href="#" class="nav-link" id="navAdminLink" onclick="app.navigate('admin')" data-target="admin">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Admin Panel
          </a>
        </nav>
        <div style="margin-top:auto; padding:var(--sp-md) 0">
           <a href="#" class="nav-link" onclick="app.logout()" style="color:var(--text-secondary)">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
             Logout
           </a>
        </div>
      </aside>"""
    html = html.replace("""        <nav class="nav-links">
          <a href="#" class="nav-link active" onclick="app.navigate('dashboard')" data-target="dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
          </a>
          <a href="#" class="nav-link" onclick="app.navigate('all-tickets')" data-target="all-tickets">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            All Tickets
          </a>
          <a href="#" class="nav-link" id="navAdminLink" onclick="app.navigate('admin')" data-target="admin">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Admin Panel
          </a>
        </nav>
      </aside>""", logout_btn)

    # Note: Because the original html might just have `</a>\n        </nav>\n      </aside>`, let's ensure it exists
    if logout_btn not in html:
        # fallback patch
        html = html.replace('</nav>\n      </aside>', '</nav>\n        <div style="margin-top:auto; padding:var(--sp-md) 0"><a href="#" class="nav-link" onclick="app.logout()" style="color:var(--text-secondary)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Logout</a></div>\n      </aside>')

    # C. Lock the layout container by default until logged in
    html = html.replace('<div class="layout-container">', '<div class="layout-container app-locked" id="mainLayout">')

    # D. Add new fields to Admin -> Add Agent form
    admin_agent_orig = """                <div style="padding:var(--sp-md); display:grid; grid-template-columns:1fr 1fr; gap:var(--sp-md)">
                  <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" id="newAgentName" class="form-input" placeholder="e.g. Jane Smith">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Tech Group</label>
                    <select id="newAgentGroup" class="form-input">
                      <option value="L1 Support">L1 Support</option>
                      <option value="L2 Support">L2 Support</option>
                      <option value="Network">Network</option>
                      <option value="Database">Database</option>
                      <option value="Security">Security</option>
                    </select>
                  </div>
                </div>"""
                
    admin_agent_new = """                <div style="padding:var(--sp-md); display:grid; grid-template-columns:1fr 1fr; gap:var(--sp-md)">
                  <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" id="newAgentName" class="form-input" placeholder="e.g. Jane Smith">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Tech Group</label>
                    <select id="newAgentGroup" class="form-input">
                      <option value="L1 Support">L1 Support</option>
                      <option value="L2 Support">L2 Support</option>
                      <option value="Network">Network</option>
                      <option value="Database">Database</option>
                      <option value="Security">Security</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Username</label>
                    <input type="text" id="newAgentUser" class="form-input" placeholder="e.g. jsmith">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" id="newAgentPass" class="form-input" placeholder="••••••••">
                  </div>
                  <div class="form-group">
                    <label class="form-label">System Role</label>
                    <select id="newAgentRole" class="form-input">
                      <option value="technician">Technician</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>"""
                
    html = html.replace(admin_agent_orig, admin_agent_new)
    index_path.write_text(html, encoding='utf-8')
    print("Patched index.html")


# --- 3. Patch app.js ---
app_js = app_path.read_text(encoding='utf-8')

# A. Convert CURRENT_USER from const to let
if "const CURRENT_USER" in app_js:
    app_js = app_js.replace("const CURRENT_USER = { name: 'IT Admin', role: 'admin' };", "let CURRENT_USER = null;")

# B. Inject Login / Auth methods into the app object
login_methods = """
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
"""

if 'verifySession()' not in app_js:
    app_js = app_js.replace("const app = {", "const app = {\n" + login_methods)

# C. Update init()
init_call_orig = """    this.navigate('dashboard');
    setInterval(() => this.renderDashboardCharts(), 60000);"""
    
init_call_new = """    // Init Session
    if (this.verifySession()) {
      this.navigate('dashboard');
    }
    setInterval(() => { if (CURRENT_USER) this.renderDashboardCharts(); }, 60000);"""
app_js = app_js.replace(init_call_orig, init_call_new)

# D. RBAC in navigate()
nav_orig = """  navigate(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));"""
    
nav_new = """  navigate(viewId) {
    if (viewId === 'admin' && CURRENT_USER?.role !== 'admin') {
       Toast.show('Access Denied: Administrators only', 'error');
       return;
    }
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));"""
app_js = app_js.replace(nav_orig, nav_new)

# E. Update addAgent() schema
add_agent_orig = """    const newAgent = { id: newId, name, initials, group: groupInput.value };
    // Insert before unassigned"""
add_agent_new = """    const uUser = document.getElementById('newAgentUser')?.value.trim() || '';
    const uPass = document.getElementById('newAgentPass')?.value || '';
    const uRole = document.getElementById('newAgentRole')?.value || 'technician';
    if (!uUser || !uPass) { Toast.show('Username and Password are required', 'warning'); return; }
    
    const newAgent = { id: newId, name, initials, group: groupInput.value, username: uUser, password: uPass, role: uRole };
    // Insert before unassigned"""
app_js = app_js.replace(add_agent_orig, add_agent_new)

# F. Hide unassigned ticket submitter mapping issues
submitter_orig = """submitter: contactName || CURRENT_USER.name,"""
submitter_new = """submitter: contactName || (CURRENT_USER ? CURRENT_USER.name : 'Unknown User'),"""
app_js = app_js.replace(submitter_orig, submitter_new)


app_path.write_text(app_js, encoding='utf-8')
print("Patched app.js")
