function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}
function hoursAgo(n) {
  const d = new Date()
  d.setHours(d.getHours() - n)
  return d.toISOString()
}

export const DEFAULT_AGENTS = [
  { id: 'a1', name: 'Sarah Chen',    initials: 'SC', group: 'Security',     username: 'sarah',   password: 'sarah123',   role: 'technician' },
  { id: 'a2', name: 'Marcus Webb',   initials: 'MW', group: 'Network',      username: 'marcus',  password: 'marcus123',  role: 'technician' },
  { id: 'a3', name: 'Priya Nair',    initials: 'PN', group: 'L1 Support',   username: 'priya',   password: 'priya123',   role: 'technician' },
  { id: 'a4', name: 'Tom Bradley',   initials: 'TB', group: 'Application',  username: 'tom',     password: 'tom123',     role: 'technician' },
  { id: 'admin', name: 'John Doe',   initials: 'JD', group: 'IT Admin',     username: 'admin',   password: 'admin',      role: 'admin' },
  { id: 'unassigned', name: 'Unassigned', initials: '—', group: '—' },
]

export const DEFAULT_SLA = {
  critical: 1, high: 4, medium: 8, low: 24,
  timerStart: 'on_creation',      // 'on_creation' | 'on_assignment'
  countdownMode: '24_7',          // '24_7' | 'business_hours'
  workDays: [0, 1, 2, 3, 4],     // 0=Mon … 6=Sun
  workStart: '09:00',
  workEnd: '20:00',
  pauseOn: ['on-hold'],           // statuses that pause SLA
}

export const DEFAULT_EMAIL_CONFIG = {
  type: 'smtp',
  smtp: { host: '', port: '587', security: 'tls', from: '', user: '', pass: '' },
  m365: { tenantId: '', clientId: '', clientSecret: '', from: '' },
  oauth: {
    provider: 'google',          // 'google' | 'microsoft' | 'custom'
    clientId: '',
    clientSecret: '',
    redirectUri: 'http://localhost:5173/admin/oauth/callback',
    scopes: 'https://mail.google.com/',
    authEndpoint: '',            // auto-filled per provider, or custom
    tokenEndpoint: '',           // auto-filled per provider, or custom
    from: '',
    // Runtime state (not persisted to backend in real app — demo only)
    connected: false,
    connectedEmail: '',
    tokenExpiry: null,
  },
}

export const DEFAULT_EMAIL_TRIGGERS = { new: false, assign: false, resolve: false }

// ── Dynamic categories ────────────────────────────────────────────────────────
export const DEFAULT_CATEGORIES = [
  { id: 'hardware',  name: 'Hardware',      color: '#8B5CF6', isBuiltin: true,  sortOrder: 1,  description: 'Physical equipment issues' },
  { id: 'software',  name: 'Software',      color: '#3B82F6', isBuiltin: true,  sortOrder: 2,  description: 'Application and OS issues' },
  { id: 'network',   name: 'Network',       color: '#10B981', isBuiltin: true,  sortOrder: 3,  description: 'Connectivity and network issues' },
  { id: 'access',    name: 'Access',        color: '#F59E0B', isBuiltin: true,  sortOrder: 4,  description: 'Permissions and login issues' },
  { id: 'email',     name: 'Email',         color: '#EF4444', isBuiltin: true,  sortOrder: 5,  description: 'Email and messaging issues' },
  { id: 'security',  name: 'Security',      color: '#EC4899', isBuiltin: true,  sortOrder: 6,  description: 'Security incidents and threats' },
  { id: 'other',     name: 'Other',         color: '#6B7280', isBuiltin: true,  sortOrder: 7,  description: 'Uncategorised requests' },
]

export const DEFAULT_INBOUND_EMAIL = {
  enabled: false,
  authType: 'basic',           // 'basic' | 'oauth' | 'graph'
  // IMAP
  imapHost: '',
  imapPort: '993',
  imapSsl: true,
  imapUser: '',
  imapPass: '',
  imapFolder: 'INBOX',
  // Graph (M365)
  graphMailbox: '',
  // Auto-ticket defaults
  defaultCategory: 'other',
  defaultPriority: 'medium',
  defaultAssignee: 'unassigned',
  // Polling
  pollIntervalMinutes: 5,
  markSeen: true,
  moveToFolder: '',
  // Stats (updated at runtime)
  lastPolledAt: null,
  processedCount: 0,
}

// Demo email log entries (shown in the UI log table)
export const DEFAULT_EMAIL_LOG = []

// ── Ticket Groups ─────────────────────────────────────────────────────────────
export const DEFAULT_GROUPS = [
  { id: 'security',    name: 'Security',     description: 'Security incidents and threats',    color: '#EC4899', isBuiltin: true },
  { id: 'network',     name: 'Network',      description: 'Network and connectivity issues',    color: '#10B981', isBuiltin: true },
  { id: 'l1-support',  name: 'L1 Support',   description: 'First-line general support',         color: '#3B82F6', isBuiltin: true },
  { id: 'application', name: 'Application',  description: 'Software and application support',   color: '#8B5CF6', isBuiltin: true },
  { id: 'it-admin',    name: 'IT Admin',      description: 'IT administration and management',  color: '#F59E0B', isBuiltin: true },
  { id: 'hardware',    name: 'Hardware',      description: 'Physical equipment and devices',    color: '#EF4444', isBuiltin: true },
]

// ── Ticket Settings ───────────────────────────────────────────────────────────
export const DEFAULT_TICKET_SETTINGS = {
  numberPrefix:    'TKT',    // prefix before the dash  e.g. TKT → TKT-0001
  numberDigits:    4,        // zero-pad length          4 → 0001
  defaultStatus:   'open',
  defaultPriority: 'low',
}

// ── Email Templates ───────────────────────────────────────────────────────────
export const DEFAULT_EMAIL_TEMPLATES = {
  ticketOpen: {
    enabled: true,
    subject: 'Ticket [{ticket_id}] Opened: {ticket_subject}',
    body:
`Hi {contact_name},

Thank you for reaching out. Your support ticket has been successfully created.

────────────────────────────
Ticket ID  : {ticket_id}
Subject    : {ticket_subject}
Priority   : {ticket_priority}
Status     : {ticket_status}
────────────────────────────

Our support team will review your request and respond as soon as possible.

Regards,
{company_name} IT Support`,
  },
  ticketClosed: {
    enabled: true,
    subject: 'Ticket [{ticket_id}] Closed: {ticket_subject}',
    body:
`Hi {contact_name},

We are pleased to let you know that your support ticket has been resolved and closed.

────────────────────────────
Ticket ID  : {ticket_id}
Subject    : {ticket_subject}
Closed By  : {agent_name}
Closed On  : {closed_date}
────────────────────────────

If the issue recurs or you need further help, please open a new ticket.

Regards,
{company_name} IT Support`,
  },
}

export const SEED_TICKETS = [
  {
    id: 'TKT-0001',
    type: 'incident',
    subject: "Laptop won't boot after Windows update",
    category: 'software',
    priority: 'high',
    status: 'open',
    assignee: 'a1',
    submitter: 'Alice Nguyen',
    company: 'Acme Corp',
    contactName: 'Alice Nguyen',
    email: 'alice@acme.com',
    phone: '',
    asset: 'LAPTOP-042',
    description: 'After installing the latest Windows cumulative update (KB5034441) last night, my laptop now shows a blue screen on boot with error code 0x0000007B. I cannot get past the boot screen. I have tried safe mode but it also fails.',
    created: daysAgo(3),
    updated: daysAgo(1),
    timeline: [
      { type: 'created', text: 'Ticket submitted by <strong>Alice Nguyen</strong>', ts: daysAgo(3) },
      { type: 'assign',  text: 'Assigned to <strong>Sarah Chen</strong>', ts: daysAgo(2) },
      { type: 'comment', text: "We're investigating the update rollback. Will update shortly.", author: 'Sarah Chen', ts: daysAgo(1) },
    ],
  },
  {
    id: 'TKT-0002',
    type: 'incident',
    subject: 'VPN disconnects every 30 minutes',
    category: 'network',
    priority: 'medium',
    status: 'in-progress',
    assignee: 'a2',
    submitter: 'David Patel',
    company: 'Acme Corp',
    contactName: 'David Patel',
    email: 'david@acme.com',
    phone: '',
    asset: '',
    description: 'The VPN client drops connection approximately every 30 minutes and requires a manual reconnect. Error in logs: "TLS handshake timeout". Affects approximately 12 users.',
    created: daysAgo(5),
    updated: daysAgo(1),
    timeline: [
      { type: 'created', text: 'Ticket submitted by <strong>David Patel</strong>', ts: daysAgo(5) },
      { type: 'assign',  text: 'Assigned to <strong>Marcus Webb</strong>', ts: daysAgo(4) },
      { type: 'status',  text: 'Status changed to <strong>In Progress</strong>', ts: daysAgo(3) },
      { type: 'comment', text: 'Identified issue with keep-alive settings on the Cisco ASA. Pushing a config change tonight.', author: 'Marcus Webb', ts: daysAgo(1) },
    ],
  },
  {
    id: 'TKT-0003',
    type: 'incident',
    subject: 'Printer on Floor 3 offline',
    category: 'hardware',
    priority: 'low',
    status: 'resolved',
    assignee: 'a3',
    submitter: 'Emma Solis',
    company: 'Acme Corp',
    contactName: 'Emma Solis',
    email: 'emma@acme.com',
    phone: '',
    asset: 'Printer-Floor3',
    description: 'The HP LaserJet on Floor 3 (asset tag HP-LJ-F3-02) is showing as offline. Users cannot print.',
    created: daysAgo(7),
    updated: daysAgo(2),
    timeline: [
      { type: 'created',  text: 'Ticket submitted by <strong>Emma Solis</strong>', ts: daysAgo(7) },
      { type: 'assign',   text: 'Assigned to <strong>Priya Nair</strong>', ts: daysAgo(6) },
      { type: 'status',   text: 'Status changed to <strong>In Progress</strong>', ts: daysAgo(5) },
      { type: 'comment',  text: 'Found a bad network cable at the patch panel. Replaced and printer is back online.', author: 'Priya Nair', ts: daysAgo(2) },
      { type: 'resolved', text: 'Ticket resolved by <strong>Priya Nair</strong>', ts: daysAgo(2) },
    ],
  },
  {
    id: 'TKT-0004',
    type: 'incident',
    subject: 'Ransomware detected on DESKTOP-17',
    category: 'security',
    priority: 'critical',
    status: 'in-progress',
    assignee: 'a1',
    submitter: "Frank O'Brien",
    company: 'Acme Corp',
    contactName: "Frank O'Brien",
    email: 'frank@acme.com',
    phone: '',
    asset: 'DESKTOP-17',
    description: "Kaspersky endpoint flagged a ransomware variant (Ryuk) on DESKTOP-17 at 09:14 AM. The machine has been isolated from the network.",
    created: daysAgo(0),
    updated: daysAgo(0),
    timeline: [
      { type: 'created', text: "Ticket submitted by <strong>Frank O'Brien</strong>", ts: daysAgo(0) },
      { type: 'assign',  text: 'Escalated and assigned to <strong>Sarah Chen</strong>', ts: daysAgo(0) },
      { type: 'comment', text: 'Machine isolated. Begun forensic imaging. Do NOT reconnect to network.', author: 'Sarah Chen', ts: daysAgo(0) },
    ],
  },
  {
    id: 'TKT-0005',
    type: 'incident',
    subject: 'Outlook cannot connect to Exchange server',
    category: 'email',
    priority: 'high',
    status: 'open',
    assignee: 'unassigned',
    submitter: 'Grace Kim',
    company: 'Acme Corp',
    contactName: 'Grace Kim',
    email: 'grace@acme.com',
    phone: '',
    asset: '',
    description: 'Since this morning, several users on the 2nd floor are unable to connect Outlook to the Exchange server. Approx. 8 users affected.',
    created: daysAgo(1),
    updated: daysAgo(1),
    timeline: [
      { type: 'created', text: 'Ticket submitted by <strong>Grace Kim</strong>', ts: daysAgo(1) },
    ],
  },
  {
    id: 'TKT-0006',
    type: 'request',
    subject: 'Request access to SharePoint Finance site',
    category: 'access',
    priority: 'low',
    status: 'closed',
    assignee: 'a4',
    submitter: 'Henry Liu',
    company: 'Acme Corp',
    contactName: 'Henry Liu',
    email: 'henry@acme.com',
    phone: '',
    asset: '',
    description: 'I need read-only access to the Finance SharePoint site for the Q2 audit preparation.',
    created: daysAgo(10),
    updated: daysAgo(8),
    timeline: [
      { type: 'created',  text: 'Ticket submitted by <strong>Henry Liu</strong>', ts: daysAgo(10) },
      { type: 'assign',   text: 'Assigned to <strong>Tom Bradley</strong>', ts: daysAgo(9) },
      { type: 'comment',  text: 'Access granted. Please verify you can now access the site.', author: 'Tom Bradley', ts: daysAgo(8) },
      { type: 'resolved', text: 'Ticket closed by <strong>Tom Bradley</strong>', ts: daysAgo(8) },
    ],
  },
  {
    id: 'TKT-0007',
    type: 'incident',
    subject: 'Monitor flickering on workstation',
    category: 'hardware',
    priority: 'medium',
    status: 'on-hold',
    assignee: 'a2',
    submitter: 'Isabella Torres',
    company: 'Acme Corp',
    contactName: 'Isabella Torres',
    email: 'isabella@acme.com',
    phone: '',
    asset: 'WS-MK-022',
    description: "The external Dell 27\" monitor connected to my docking station has been flickering intermittently for 2 days.",
    created: daysAgo(4),
    updated: daysAgo(2),
    timeline: [
      { type: 'created', text: 'Ticket submitted by <strong>Isabella Torres</strong>', ts: daysAgo(4) },
      { type: 'assign',  text: 'Assigned to <strong>Marcus Webb</strong>', ts: daysAgo(3) },
      { type: 'status',  text: 'Status changed to <strong>On Hold</strong> — waiting for replacement monitor from procurement', ts: daysAgo(2) },
    ],
  },
  {
    id: 'TKT-0008',
    type: 'request',
    subject: 'Software installation request: Adobe Premiere Pro',
    category: 'software',
    priority: 'low',
    status: 'open',
    assignee: 'unassigned',
    submitter: 'James Okafor',
    company: 'Acme Corp',
    contactName: 'James Okafor',
    email: 'james@acme.com',
    phone: '',
    asset: 'LAPTOP-089',
    description: 'The Marketing team requires Adobe Premiere Pro CC installed on LAPTOP-089 for the upcoming product launch video campaign.',
    created: daysAgo(2),
    updated: daysAgo(2),
    timeline: [
      { type: 'created', text: 'Ticket submitted by <strong>James Okafor</strong>', ts: daysAgo(2) },
    ],
  },
  {
    id: 'TKT-0009',
    type: 'incident',
    subject: 'Wi-Fi dead zone in Conference Room B',
    category: 'network',
    priority: 'medium',
    status: 'in-progress',
    assignee: 'a3',
    submitter: 'Karen Mills',
    company: 'Acme Corp',
    contactName: 'Karen Mills',
    email: 'karen@acme.com',
    phone: '',
    asset: '',
    description: 'Conference Room B on the 4th floor has virtually no Wi-Fi signal. Important client meetings are scheduled this week.',
    created: daysAgo(6),
    updated: daysAgo(1),
    timeline: [
      { type: 'created', text: 'Ticket submitted by <strong>Karen Mills</strong>', ts: daysAgo(6) },
      { type: 'assign',  text: 'Assigned to <strong>Priya Nair</strong>', ts: daysAgo(5) },
      { type: 'status',  text: 'Status changed to <strong>In Progress</strong>', ts: daysAgo(3) },
      { type: 'comment', text: 'Surveyed with Wi-Fi analyzer. Planning to add an access point. Parts ordered.', author: 'Priya Nair', ts: daysAgo(1) },
    ],
  },
  {
    id: 'TKT-0010',
    type: 'request',
    subject: 'Password reset — account locked after failed attempts',
    category: 'access',
    priority: 'high',
    status: 'resolved',
    assignee: 'a4',
    submitter: 'Leo Fernandez',
    company: 'Acme Corp',
    contactName: 'Leo Fernandez',
    email: 'leo@acme.com',
    phone: '',
    asset: '',
    description: 'My Active Directory account has been locked out after 3 failed password attempts this morning.',
    created: daysAgo(1),
    updated: hoursAgo(3),
    timeline: [
      { type: 'created',  text: 'Ticket submitted by <strong>Leo Fernandez</strong>', ts: daysAgo(1) },
      { type: 'assign',   text: 'Assigned to <strong>Tom Bradley</strong>', ts: daysAgo(1) },
      { type: 'comment',  text: 'Account unlocked and temporary password issued via secure channel.', author: 'Tom Bradley', ts: hoursAgo(3) },
      { type: 'resolved', text: 'Ticket resolved by <strong>Tom Bradley</strong>', ts: hoursAgo(3) },
    ],
  },
  {
    id: 'TKT-0011',
    type: 'incident',
    subject: 'Microsoft Teams crashes on startup',
    category: 'software',
    priority: 'medium',
    status: 'open',
    assignee: 'a1',
    submitter: 'Mia Johansson',
    company: 'Acme Corp',
    contactName: 'Mia Johansson',
    email: 'mia@acme.com',
    phone: '',
    asset: 'LAPTOP-061',
    description: "Teams crashes immediately on launch. I've tried clearing the cache folder but the issue persists.",
    created: daysAgo(3),
    updated: daysAgo(2),
    timeline: [
      { type: 'created', text: 'Ticket submitted by <strong>Mia Johansson</strong>', ts: daysAgo(3) },
      { type: 'assign',  text: 'Assigned to <strong>Sarah Chen</strong>', ts: daysAgo(2) },
    ],
  },
  {
    id: 'TKT-0012',
    type: 'incident',
    subject: 'Server room cooling alarm triggered',
    category: 'hardware',
    priority: 'critical',
    status: 'resolved',
    assignee: 'a2',
    submitter: 'Noah Bergman',
    company: 'Acme Corp',
    contactName: 'Noah Bergman',
    email: 'noah@acme.com',
    phone: '',
    asset: 'SRV-ROOM-1',
    description: 'The temperature alarm in Server Room 1 triggered at 08:45 AM. Temperature reading: 38°C (threshold 35°C).',
    created: daysAgo(14),
    updated: daysAgo(13),
    timeline: [
      { type: 'created',  text: 'Ticket submitted by <strong>Noah Bergman</strong>', ts: daysAgo(14) },
      { type: 'assign',   text: 'Escalated to <strong>Marcus Webb</strong>', ts: daysAgo(14) },
      { type: 'comment',  text: 'On-site. Failed HVAC unit identified. Portable cooling deployed.', author: 'Marcus Webb', ts: daysAgo(14) },
      { type: 'resolved', text: 'HVAC unit repaired. Temperature back to 21°C.', ts: daysAgo(13) },
    ],
  },
  {
    id: 'TKT-0013',
    type: 'incident',
    subject: 'USB ports not working on docking station',
    category: 'hardware',
    priority: 'low',
    status: 'open',
    assignee: 'unassigned',
    submitter: 'Olivia Reed',
    company: 'Acme Corp',
    contactName: 'Olivia Reed',
    email: 'olivia@acme.com',
    phone: '',
    asset: 'DOCK-HP-034',
    description: 'None of the USB 3.0 ports on the HP Thunderbolt G4 docking station are working.',
    created: hoursAgo(5),
    updated: hoursAgo(5),
    timeline: [
      { type: 'created', text: 'Ticket submitted by <strong>Olivia Reed</strong>', ts: hoursAgo(5) },
    ],
  },
  {
    id: 'TKT-0014',
    type: 'incident',
    subject: 'Phishing email received — potential breach',
    category: 'security',
    priority: 'critical',
    status: 'open',
    assignee: 'a1',
    submitter: 'Paul Zhang',
    company: 'Acme Corp',
    contactName: 'Paul Zhang',
    email: 'paul@acme.com',
    phone: '',
    asset: '',
    description: 'I received a very convincing phishing email purportedly from our CEO asking to urgently wire transfer $15,000.',
    created: hoursAgo(2),
    updated: hoursAgo(2),
    timeline: [
      { type: 'created', text: 'Ticket submitted by <strong>Paul Zhang</strong>', ts: hoursAgo(2) },
      { type: 'assign',  text: 'Assigned to <strong>Sarah Chen</strong> (Security Team)', ts: hoursAgo(2) },
    ],
  },
  {
    id: 'TKT-0015',
    type: 'incident',
    subject: 'Slow internet speed affecting entire office',
    category: 'network',
    priority: 'high',
    status: 'on-hold',
    assignee: 'a2',
    submitter: 'Quinn Adams',
    company: 'Acme Corp',
    contactName: 'Quinn Adams',
    email: 'quinn@acme.com',
    phone: '',
    asset: '',
    description: 'Internet speeds have been extremely slow since Monday. Speed tests show 2 Mbps vs contracted 500 Mbps.',
    created: daysAgo(2),
    updated: daysAgo(1),
    timeline: [
      { type: 'created', text: 'Ticket submitted by <strong>Quinn Adams</strong>', ts: daysAgo(2) },
      { type: 'assign',  text: 'Assigned to <strong>Marcus Webb</strong>', ts: daysAgo(2) },
      { type: 'status',  text: 'Status changed to <strong>On Hold</strong> — ISP escalation ticket #ISP-88423 raised', ts: daysAgo(1) },
    ],
  },
]
