import pathlib
import sys

# Paths
app_path = pathlib.Path(r"c:\Users\DanielVenkat\.gemini\antigravity\scratch\it-support-ticketing\app.js")
index_path = pathlib.Path(r"c:\Users\DanielVenkat\.gemini\antigravity\scratch\it-support-ticketing\index.html")

# 1. Patch app.js
app_js = app_path.read_text(encoding='utf-8')

# We need to change SMTP_SETTINGS to EMAIL_CONFIG
if "let SMTP_SETTINGS" in app_js:
    app_js = app_js.replace(
        "let SMTP_SETTINGS = { host: '', port: '587', security: 'tls', from: '', user: '', pass: '' };",
        "let EMAIL_CONFIG = { type: 'smtp', smtp: { host: '', port: '587', security: 'tls', from: '', user: '', pass: '' }, m365: { tenantId: '', clientId: '', clientSecret: '', from: '' } };"
    )

    app_js = app_js.replace(
        "SMTP_SETTINGS = settings.smtp || SMTP_SETTINGS;",
        "EMAIL_CONFIG = settings.emailConfig || EMAIL_CONFIG;"
    )

    # Replace the HTML population logic in switchAdminTab
    tab_code_orig = """      if(document.getElementById('smtpHost')) {
          document.getElementById('smtpHost').value = SMTP_SETTINGS.host || '';
          document.getElementById('smtpPort').value = SMTP_SETTINGS.port || '';
          document.getElementById('smtpSecurity').value = SMTP_SETTINGS.security || 'tls';
          document.getElementById('smtpFrom').value = SMTP_SETTINGS.from || '';
          document.getElementById('smtpUser').value = SMTP_SETTINGS.user || '';
          document.getElementById('smtpPass').value = SMTP_SETTINGS.pass || '';
      }"""
    
    tab_code_new = """      if(document.getElementById('emailConnType')) {
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
      }"""
    app_js = app_js.replace(tab_code_orig, tab_code_new)

    # Replace the save and test logic
    save_smtp_orig = """  saveSMTPSettings() {
    SMTP_SETTINGS = {
      host: document.getElementById('smtpHost').value.trim(),
      port: document.getElementById('smtpPort').value.trim(),
      security: document.getElementById('smtpSecurity').value,
      from: document.getElementById('smtpFrom').value.trim(),
      user: document.getElementById('smtpUser').value.trim(),
      pass: document.getElementById('smtpPass').value
    };
    const s = store.loadSettings(); s.smtp = SMTP_SETTINGS; store.saveSettings(s);
    Toast.show('SMTP Settings saved successfully', 'success');
  },

  testSMTPSettings() {
    if (!SMTP_SETTINGS.host) return Toast.show('Please configure SMTP Host first', 'warning');
    Toast.show(`Simulating test email via ${SMTP_SETTINGS.host}...`, 'info');
    setTimeout(() => {
        Toast.show(`[SMTP SUCCESS] Test email sent from ${SMTP_SETTINGS.from || 'test@example.com'}`, 'success');
    }, 1500);
  },"""
    
    save_config_new = """  toggleEmailConfigView() {
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
  },"""
    app_js = app_js.replace(save_smtp_orig, save_config_new)
    app_path.write_text(app_js, encoding='utf-8')

# 2. Patch index.html
html = index_path.read_text(encoding='utf-8')

smtp_block_orig = """              <div class="card full-width" style="margin-top:var(--sp-md)">
                <div class="card-header"><h2 class="card-title">SMTP Server Configuration</h2></div>
                <div style="padding:var(--sp-md); display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:var(--sp-md)">
                  <div class="form-group">
                    <label class="form-label">SMTP Host</label>
                    <input type="text" id="smtpHost" class="form-input" placeholder="e.g. smtp.example.com">
                  </div>
                  <div class="form-group">
                    <label class="form-label">SMTP Port</label>
                    <input type="number" id="smtpPort" class="form-input" placeholder="e.g. 587">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Encryption</label>
                    <select id="smtpSecurity" class="form-input">
                      <option value="none">None</option>
                      <option value="tls">STARTTLS</option>
                      <option value="ssl">SSL/TLS</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">From Address</label>
                    <input type="email" id="smtpFrom" class="form-input" placeholder="support@company.com">
                  </div>
                  <div class="form-group">
                    <label class="form-label">SMTP Username</label>
                    <input type="text" id="smtpUser" class="form-input" placeholder="username">
                  </div>
                  <div class="form-group">
                    <label class="form-label">SMTP Password</label>
                    <input type="password" id="smtpPass" class="form-input" placeholder="••••••••">
                  </div>
                </div>
                <div style="padding:var(--sp-md); border-top:1px solid var(--border)">
                  <button class="btn btn-primary" onclick="app.saveSMTPSettings()">Save SMTP Settings</button>
                  <button class="btn btn-ghost" onclick="app.testSMTPSettings()">Send Test Email</button>
                </div>
              </div>"""

email_config_new = """              <div class="card full-width" style="margin-top:var(--sp-md)">
                <div class="card-header">
                  <h2 class="card-title">Email Server Configuration</h2>
                  <div style="display:flex; align-items:center; gap:8px;">
                     <span class="text-sm">Connection Type:</span>
                     <select id="emailConnType" class="form-input" style="height:32px; padding:0 8px;" onchange="app.toggleEmailConfigView()">
                        <option value="smtp">Basic Auth (SMTP)</option>
                        <option value="m365">Microsoft 365 (OAuth)</option>
                     </select>
                  </div>
                </div>
                
                <!-- SMTP Config -->
                <div id="smtpConfigBlock" style="padding:var(--sp-md); display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:var(--sp-md)">
                  <div class="form-group">
                    <label class="form-label">SMTP Host</label>
                    <input type="text" id="smtpHost" class="form-input" placeholder="e.g. smtp.office365.com">
                  </div>
                  <div class="form-group">
                    <label class="form-label">SMTP Port</label>
                    <input type="number" id="smtpPort" class="form-input" placeholder="e.g. 587">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Encryption</label>
                    <select id="smtpSecurity" class="form-input">
                      <option value="none">None</option>
                      <option value="tls">STARTTLS</option>
                      <option value="ssl">SSL/TLS</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">From Address</label>
                    <input type="email" id="smtpFrom" class="form-input" placeholder="support@company.com">
                  </div>
                  <div class="form-group">
                    <label class="form-label">SMTP Username</label>
                    <input type="text" id="smtpUser" class="form-input" placeholder="username">
                  </div>
                  <div class="form-group">
                    <label class="form-label">SMTP Password</label>
                    <input type="password" id="smtpPass" class="form-input" placeholder="••••••••">
                  </div>
                </div>

                <!-- Microsoft 365 Config -->
                <div id="m365ConfigBlock" style="padding:var(--sp-md); display:none; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:var(--sp-md)">
                  <div class="form-group">
                    <label class="form-label">Tenant ID</label>
                    <input type="text" id="m365Tenant" class="form-input" placeholder="e.g. 8ea6...3b21">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Client ID (App ID)</label>
                    <input type="text" id="m365Client" class="form-input" placeholder="e.g. a3f2...99d1">
                  </div>
                  <div class="form-group" style="grid-column: 1 / -1;">
                    <label class="form-label">Client Secret</label>
                    <input type="password" id="m365Secret" class="form-input" placeholder="••••••••">
                  </div>
                  <div class="form-group" style="grid-column: 1 / -1;">
                    <label class="form-label">From Address</label>
                    <input type="email" id="m365From" class="form-input" placeholder="support@company.onmicrosoft.com">
                    <p class="text-sm text-muted" style="margin-top:4px">Make sure the App Registration has `Mail.Send` application permissions.</p>
                  </div>
                </div>

                <div style="padding:var(--sp-md); border-top:1px solid var(--border)">
                  <button class="btn btn-primary" onclick="app.saveEmailConfig()">Save Connection Settings</button>
                  <button class="btn btn-ghost" onclick="app.testEmailConfig()">Test Connection</button>
                </div>
              </div>"""

if smtp_block_orig in html:
    html = html.replace(smtp_block_orig, email_config_new)
    index_path.write_text(html, encoding='utf-8')
    print("Successfully patched index.html")
else:
    print("Failed to find SMTP block in index.html to replace")
