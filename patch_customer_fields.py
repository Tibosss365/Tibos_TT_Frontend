import pathlib

app_path = pathlib.Path(r"c:\Users\DanielVenkat\.gemini\antigravity\scratch\it-support-ticketing\app.js")
index_path = pathlib.Path(r"c:\Users\DanielVenkat\.gemini\antigravity\scratch\it-support-ticketing\index.html")

# 1. Update index.html
html = index_path.read_text(encoding='utf-8')

new_fields_html = """                <div class="form-group">
                  <label class="form-label">Company Name <span class="required">*</span></label>
                  <input type="text" class="form-input" id="ticketCompany" placeholder="e.g. Acme Corp" required />
                  <span class="field-error" id="companyError"></span>
                </div>
                <div class="form-group">
                  <label class="form-label">Contact Name <span class="required">*</span></label>
                  <input type="text" class="form-input" id="ticketContactName" placeholder="John Doe" required />
                  <span class="field-error" id="contactNameError"></span>
                </div>
                <div class="form-group">
                  <label class="form-label">Contact Email <span class="required">*</span></label>
                  <input type="email" class="form-input" id="ticketEmail" placeholder="john@example.com" required />
                  <span class="field-error" id="emailError"></span>
                </div>
                <div class="form-group">
                  <label class="form-label">Contact Phone</label>
                  <input type="tel" class="form-input" id="ticketPhone" placeholder="+1 (555) 000-0000" />
                </div>
                <div class="form-group full">"""

if 'id="ticketCompany"' not in html:
    html = html.replace(
        '<div class="form-group full">\n                  <label class="form-label">Subject',
        new_fields_html + '\n                  <label class="form-label">Subject'
    )
    
    # Also add the new fields to the Ticket Modal display
    modal_details_orig = """            <div class="detail-row"><span class="detail-label">Asset:</span><span class="detail-value" id="modalAsset"></span></div>
            <div class="detail-row"><span class="detail-label">Created:</span><span class="detail-value" id="modalCreated"></span></div>"""
    
    modal_details_new = """            <div class="detail-row"><span class="detail-label">Company:</span><span class="detail-value" id="modalCompany"></span></div>
            <div class="detail-row"><span class="detail-label">Contact Name:</span><span class="detail-value" id="modalContactName"></span></div>
            <div class="detail-row"><span class="detail-label">Contact Email:</span><span class="detail-value" id="modalEmail"></span></div>
            <div class="detail-row"><span class="detail-label">Phone:</span><span class="detail-value" id="modalPhone"></span></div>
            <div class="detail-row"><span class="detail-label">Asset:</span><span class="detail-value" id="modalAsset"></span></div>
            <div class="detail-row"><span class="detail-label">Created:</span><span class="detail-value" id="modalCreated"></span></div>"""
            
    html = html.replace(modal_details_orig, modal_details_new)
    index_path.write_text(html, encoding='utf-8')
    print("Patched index.html")

# 2. Update app.js
app_js = app_path.read_text(encoding='utf-8')

if "document.getElementById('ticketCompany')" not in app_js:
    # 2a. Update resetNewTicketForm
    reset_orig = """    ['subjectError','categoryError','descError'].forEach(id => {"""
    reset_new = """    ['companyError','contactNameError','emailError','subjectError','categoryError','descError'].forEach(id => {"""
    app_js = app_js.replace(reset_orig, reset_new)

    # 2b. Update submitTicket
    submit_read_orig = """    const subject  = document.getElementById('ticketSubject').value.trim();"""
    submit_read_new = """    const company = document.getElementById('ticketCompany').value.trim();
    const contactName = document.getElementById('ticketContactName').value.trim();
    const email = document.getElementById('ticketEmail').value.trim();
    const phone = document.getElementById('ticketPhone').value.trim();
    const subject  = document.getElementById('ticketSubject').value.trim();"""
    app_js = app_js.replace(submit_read_orig, submit_read_new)

    submit_val_orig = """    let valid = true;
    if (!subject) { document.getElementById('subjectError').textContent = 'Subject is required'; valid = false; }"""
    submit_val_new = """    let valid = true;
    if (!company) { document.getElementById('companyError').textContent = 'Company is required'; valid = false; } else document.getElementById('companyError').textContent = '';
    if (!contactName) { document.getElementById('contactNameError').textContent = 'Contact Name is required'; valid = false; } else document.getElementById('contactNameError').textContent = '';
    if (!email || !email.includes('@')) { document.getElementById('emailError').textContent = 'Valid email is required'; valid = false; } else document.getElementById('emailError').textContent = '';
    if (!subject) { document.getElementById('subjectError').textContent = 'Subject is required'; valid = false; }"""
    app_js = app_js.replace(submit_val_orig, submit_val_new)

    ticket_obj_orig = """      subject, category, priority, status: 'open',
      assignee: 'unassigned', submitter: CURRENT_USER.name,
      asset, description: desc,"""
    ticket_obj_new = """      company, contactName, email, phone,
      subject, category, priority, status: 'open',
      assignee: 'unassigned', submitter: contactName || CURRENT_USER.name,
      asset, description: desc,"""
    app_js = app_js.replace(ticket_obj_orig, ticket_obj_new)

    # 2c. Update openTicket modal population
    open_t_orig = """    document.getElementById('modalAsset').textContent = t.asset || '—';"""
    open_t_new = """    document.getElementById('modalAsset').textContent = t.asset || '—';
    if(document.getElementById('modalCompany')) document.getElementById('modalCompany').textContent = t.company || '—';
    if(document.getElementById('modalContactName')) document.getElementById('modalContactName').textContent = t.contactName || t.submitter || '—';
    if(document.getElementById('modalEmail')) document.getElementById('modalEmail').textContent = t.email || '—';
    if(document.getElementById('modalPhone')) document.getElementById('modalPhone').textContent = t.phone || '—';"""
    app_js = app_js.replace(open_t_orig, open_t_new)

    # 2d. Update exportCSV
    csv_headers_orig = """const headers = ['ID','Subject','Category','Priority','Status','Assignee','Submitter','Asset','Created','Updated'];"""
    csv_headers_new = """const headers = ['ID','Company','Contact Name','Email','Phone','Subject','Category','Priority','Status','Assignee','Submitter','Asset','Created','Updated'];"""
    app_js = app_js.replace(csv_headers_orig, csv_headers_new)

    csv_rows_orig = """      t.id, `"${t.subject.replace(/"/g,'""')}"`, categoryLabel(t.category),
      t.priority, t.status, agentName(t.assignee), t.submitter, t.asset || '',"""
    csv_rows_new = """      t.id, `"${(t.company||'').replace(/"/g,'""')}"`, `"${(t.contactName||'').replace(/"/g,'""')}"`, t.email||'', t.phone||'',
      `"${t.subject.replace(/"/g,'""')}"`, categoryLabel(t.category),
      t.priority, t.status, agentName(t.assignee), t.submitter, t.asset || '',"""
    app_js = app_js.replace(csv_rows_orig, csv_rows_new)
    
    # 2e. Update renderTickets card to show company name
    render_ticket_orig = """<div class="ticket-meta">
          <span>${fmtDate(t.created)}</span> &bull; <span>${t.submitter}</span>"""
    render_ticket_new = """<div class="ticket-meta">
          <span>${fmtDate(t.created)}</span> &bull; <span>${t.company ? t.company + ' - ' : ''}${t.contactName || t.submitter}</span>"""
    app_js = app_js.replace(render_ticket_orig, render_ticket_new)

    app_path.write_text(app_js, encoding='utf-8')
    print("Patched app.js")
