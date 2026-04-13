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
  // ── Microsoft 365
  { id: 'exchange-outlook',         name: 'Exchange & Outlook',        color: '#0078D4', isBuiltin: false, sortOrder: 10,  groupId: 'microsoft-365',        description: 'Mailbox issues, email rules, calendar and Outlook client' },
  { id: 'teams-collaboration',      name: 'Teams & Collaboration',     color: '#464EB8', isBuiltin: false, sortOrder: 20,  groupId: 'microsoft-365',        description: 'Teams setup, meetings, channels and collaboration issues' },
  { id: 'sharepoint-onedrive',      name: 'SharePoint & OneDrive',     color: '#038387', isBuiltin: false, sortOrder: 30,  groupId: 'microsoft-365',        description: 'SharePoint sites, document libraries and OneDrive sync issues' },
  { id: 'licensing-subscriptions',  name: 'Licensing & Subscriptions', color: '#0078D4', isBuiltin: false, sortOrder: 40,  groupId: 'microsoft-365',        description: 'Licence assignment, renewals and subscription upgrades' },
  { id: 'intune-device-management', name: 'Intune & Device Management',color: '#00A4EF', isBuiltin: false, sortOrder: 50,  groupId: 'microsoft-365',        description: 'MDM enrolment, device policy and compliance management' },
  { id: 'azure-ad-entra-id',        name: 'Azure AD / Entra ID',       color: '#5C2D91', isBuiltin: false, sortOrder: 60,  groupId: 'microsoft-365',        description: 'User accounts, SSO, Conditional Access and Entra ID settings' },
  { id: 'm365-admin-centre',        name: 'M365 Admin Centre',         color: '#D83B01', isBuiltin: false, sortOrder: 70,  groupId: 'microsoft-365',        description: 'Tenant configuration, domain management and global admin tasks' },
  { id: 'mobile-apps-m365',         name: 'Mobile Apps (M365)',        color: '#742774', isBuiltin: false, sortOrder: 80,  groupId: 'microsoft-365',        description: 'Outlook mobile, Teams mobile, MFA app setup and troubleshooting' },
  // ── Migration Services
  { id: 'imap-email-migration',       name: 'IMAP Email Migration',       color: '#7C3AED', isBuiltin: false, sortOrder: 110, groupId: 'migration-services',  description: 'Migrating mailboxes from IMAP servers to Exchange Online' },
  { id: 'google-workspace-m365',      name: 'Google Workspace to M365',   color: '#6D28D9', isBuiltin: false, sortOrder: 120, groupId: 'migration-services',  description: 'Gmail, Google Drive and Google Calendar migration to Microsoft 365' },
  { id: 'avepoint-migration',         name: 'AvePoint Migration',         color: '#5B21B6', isBuiltin: false, sortOrder: 130, groupId: 'migration-services',  description: 'AvePoint-managed file and content migration projects' },
  { id: 'tenant-to-tenant-migration', name: 'Tenant-to-Tenant Migration', color: '#4C1D95', isBuiltin: false, sortOrder: 140, groupId: 'migration-services',  description: 'Cross-tenant mailbox and data moves between M365 tenants' },
  { id: 'file-share-migration',       name: 'File Share Migration',       color: '#8B5CF6', isBuiltin: false, sortOrder: 150, groupId: 'migration-services',  description: 'On-premises file shares migrated to SharePoint Online or OneDrive' },
  { id: 'user-onboarding',            name: 'User Onboarding',            color: '#A78BFA', isBuiltin: false, sortOrder: 160, groupId: 'migration-services',  description: 'New user setup, account provisioning and welcome-pack tasks' },
  // ── Security & Compliance
  { id: 'mfa-conditional-access', name: 'MFA & Conditional Access', color: '#DC2626', isBuiltin: false, sortOrder: 210, groupId: 'security-compliance', description: 'Multi-factor authentication setup and Conditional Access policy issues' },
  { id: 'microsoft-defender',     name: 'Microsoft Defender',       color: '#B91C1C', isBuiltin: false, sortOrder: 220, groupId: 'security-compliance', description: 'Endpoint, email and identity protection via Microsoft Defender' },
  { id: 'permissions-access',     name: 'Permissions & Access',     color: '#991B1B', isBuiltin: false, sortOrder: 230, groupId: 'security-compliance', description: 'Role assignments, access reviews and permission management' },
  { id: 'compliance-dlp',         name: 'Compliance & DLP',         color: '#7F1D1D', isBuiltin: false, sortOrder: 240, groupId: 'security-compliance', description: 'Retention policies, eDiscovery and data loss prevention configuration' },
  { id: 'security-incidents',     name: 'Security Incidents',       color: '#EF4444', isBuiltin: false, sortOrder: 250, groupId: 'security-compliance', description: 'Breach response, suspicious activity and security incident handling' },
  { id: 'azure-ad-identity',      name: 'Azure AD / Identity',      color: '#F87171', isBuiltin: false, sortOrder: 260, groupId: 'security-compliance', description: 'Identity governance, self-service password reset and Azure AD issues' },
  // ── Infrastructure & Network
  { id: 'firewall-network',     name: 'Firewall & Network',     color: '#059669', isBuiltin: false, sortOrder: 310, groupId: 'infrastructure-network', description: 'Firewall rules, routing, switching and network infrastructure' },
  { id: 'vpn-remote-access',    name: 'VPN & Remote Access',    color: '#047857', isBuiltin: false, sortOrder: 320, groupId: 'infrastructure-network', description: 'VPN setup, client issues and secure remote connectivity' },
  { id: 'dns-domains',          name: 'DNS & Domains',          color: '#065F46', isBuiltin: false, sortOrder: 330, groupId: 'infrastructure-network', description: 'Domain configuration, DNS records and SSL certificate management' },
  { id: 'servers-storage',      name: 'Servers & Storage',      color: '#10B981', isBuiltin: false, sortOrder: 340, groupId: 'infrastructure-network', description: 'On-premises servers, NAS devices and storage management' },
  { id: 'backup-recovery',      name: 'Backup & Recovery',      color: '#34D399', isBuiltin: false, sortOrder: 350, groupId: 'infrastructure-network', description: 'Backup job monitoring, restore requests and disaster recovery tests' },
  { id: 'internet-connectivity',name: 'Internet & Connectivity', color: '#6EE7B7', isBuiltin: false, sortOrder: 360, groupId: 'infrastructure-network', description: 'ISP issues, bandwidth problems and office connectivity outages' },
  // ── End User Support L1
  { id: 'password-account-reset', name: 'Password & Account Reset', color: '#D97706', isBuiltin: false, sortOrder: 410, groupId: 'end-user-support', description: 'Password resets, account lockouts and self-service recovery' },
  { id: 'hardware-devices',       name: 'Hardware & Devices',       color: '#B45309', isBuiltin: false, sortOrder: 420, groupId: 'end-user-support', description: 'Laptops, desktops, monitors and peripheral hardware issues' },
  { id: 'software-installation',  name: 'Software Installation',    color: '#92400E', isBuiltin: false, sortOrder: 430, groupId: 'end-user-support', description: 'Application installs, updates and software licence requests' },
  { id: 'printing-peripherals',   name: 'Printing & Peripherals',   color: '#F59E0B', isBuiltin: false, sortOrder: 440, groupId: 'end-user-support', description: 'Printers, scanners, drivers and peripheral device support' },
  { id: 'how-to-training',        name: 'How-to & Training',        color: '#FCD34D', isBuiltin: false, sortOrder: 450, groupId: 'end-user-support', description: 'User guidance, feature walkthroughs and self-service how-to requests' },
  // ── Azure & Cloud
  { id: 'azure-virtual-machines', name: 'Azure Virtual Machines', color: '#2563EB', isBuiltin: false, sortOrder: 510, groupId: 'azure-cloud', description: 'VM provisioning, sizing, patching and virtual machine management' },
  { id: 'azure-storage',          name: 'Azure Storage',          color: '#1D4ED8', isBuiltin: false, sortOrder: 520, groupId: 'azure-cloud', description: 'Blob storage, Azure Files and Recovery Services vault management' },
  { id: 'azure-networking',       name: 'Azure Networking',       color: '#1E40AF', isBuiltin: false, sortOrder: 530, groupId: 'azure-cloud', description: 'Virtual networks, NSGs, ExpressRoute and Azure network configuration' },
  { id: 'cost-management',        name: 'Cost Management',        color: '#1E3A8A', isBuiltin: false, sortOrder: 540, groupId: 'azure-cloud', description: 'Azure budgets, cost alerts and resource cost optimisation' },
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

// ── Ticket Groups (agent support teams) ──────────────────────────────────────
export const DEFAULT_GROUPS = [
  { id: 'microsoft-365',        name: 'Microsoft 365',          description: 'Exchange Online, Teams, SharePoint, Intune and all M365 workloads', color: '#0078D4', isBuiltin: false },
  { id: 'migration-services',   name: 'Migration Services',     description: 'Mailbox, tenant-to-tenant and file-share migration projects',        color: '#7C3AED', isBuiltin: false },
  { id: 'security-compliance',  name: 'Security & Compliance',  description: 'Defender, Conditional Access, DLP, Purview and threat response',     color: '#DC2626', isBuiltin: false },
  { id: 'infrastructure-network', name: 'Infrastructure & Network', description: 'Active Directory, networking, servers and virtualisation',       color: '#059669', isBuiltin: false },
  { id: 'end-user-support',     name: 'End User Support L1',    description: 'First-line support for accounts, hardware, software and email',      color: '#D97706', isBuiltin: false },
  { id: 'azure-cloud',          name: 'Azure & Cloud',          description: 'Azure infrastructure, Entra ID, backup and cloud cost management',   color: '#2563EB', isBuiltin: false },
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
