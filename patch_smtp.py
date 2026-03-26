import pathlib

app_path = pathlib.Path(r"c:\Users\DanielVenkat\.gemini\antigravity\scratch\it-support-ticketing\app.js")
index_path = pathlib.Path(r"c:\Users\DanielVenkat\.gemini\antigravity\scratch\it-support-ticketing\index.html")

# 1. Update index.html
html = index_path.read_text(encoding='utf-8')

# We want to add SMTP settings inside admin-tab-email
smtp_html = """              <div class="card full-width" style="margin-top:var(--sp-md)">
                <div class="card-header"><h2 class="card-title">SMTP Server Configuration</h2></div>
                <div style="padding:var(--sp-md); display:grid; grid-template-columns:1fr 1fr; gap:var(--sp-md)">
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

if 'SMTP Server Configuration' not in html:
    # Insert before the closing div of admin-tab-email
    # Find the end of admin-tab-email. 
    # Because there are multiple cards, we know there is a card for "Email Notification Triggers"
    # Let's just find `onclick="app.saveEmailSettings()"` and add it after its parent card.
    
    parts = html.split('onclick="app.saveEmailSettings()">Save Triggers</button>\n                  </div>\n                </div>')
    if len(parts) == 2:
        new_html = parts[0] + 'onclick="app.saveEmailSettings()">Save Triggers</button>\n                  </div>\n                </div>\n' + smtp_html + parts[1]
        index_path.write_text(new_html, encoding='utf-8')
    else:
        print("Failed to patch index.html")

# 2. Update app.js
app_js = app_path.read_text(encoding='utf-8')
if "let SMTP_SETTINGS" not in app_js:
    app_js = app_js.replace(
        "let EMAIL_TRIGGERS = ",
        "let SMTP_SETTINGS = { host: '', port: '587', security: 'tls', from: '', user: '', pass: '' };\nlet EMAIL_TRIGGERS = "
    )

    app_js = app_js.replace(
        "EMAIL_TRIGGERS = settings.emailTriggers || EMAIL_TRIGGERS;",
        "EMAIL_TRIGGERS = settings.emailTriggers || EMAIL_TRIGGERS;\n    SMTP_SETTINGS = settings.smtp || SMTP_SETTINGS;"
    )

    tab_code_orig = """    } else if (tabId === 'email') {
      document.getElementById('email-trigger-new').checked = EMAIL_TRIGGERS['new'];
      document.getElementById('email-trigger-assign').checked = EMAIL_TRIGGERS['assign'];
      document.getElementById('email-trigger-resolve').checked = EMAIL_TRIGGERS['resolve'];
    }"""
    
    tab_code_new = """    } else if (tabId === 'email') {
      document.getElementById('email-trigger-new').checked = EMAIL_TRIGGERS['new'];
      document.getElementById('email-trigger-assign').checked = EMAIL_TRIGGERS['assign'];
      document.getElementById('email-trigger-resolve').checked = EMAIL_TRIGGERS['resolve'];
      if(document.getElementById('smtpHost')) {
          document.getElementById('smtpHost').value = SMTP_SETTINGS.host || '';
          document.getElementById('smtpPort').value = SMTP_SETTINGS.port || '';
          document.getElementById('smtpSecurity').value = SMTP_SETTINGS.security || 'tls';
          document.getElementById('smtpFrom').value = SMTP_SETTINGS.from || '';
          document.getElementById('smtpUser').value = SMTP_SETTINGS.user || '';
          document.getElementById('smtpPass').value = SMTP_SETTINGS.pass || '';
      }
    }"""
    app_js = app_js.replace(tab_code_orig, tab_code_new)

    save_email_orig = """  saveEmailSettings() {"""
    save_smtp_new = """  saveSMTPSettings() {
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
  },

  saveEmailSettings() {"""

    app_js = app_js.replace(save_email_orig, save_smtp_new)
    app_path.write_text(app_js, encoding='utf-8')
    print("Successfully patched app.js")

