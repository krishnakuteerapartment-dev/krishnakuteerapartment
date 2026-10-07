/* Krishna Kuteer - Google Sheets backend.
   Paste into Extensions > Apps Script of your Google Sheet, run setup() once, then Deploy > Web app. */

const TABLES = {
  flats: ['id', 'flat_no', 'monthly_amount'],
  payments: ['id', 'receipt_no', 'flat_id', 'month', 'amount', 'paid_on', 'mode', 'reference', 'remarks', 'created_at'],
  expenses: ['id', 'spent_on', 'category', 'amount', 'paid_to', 'mode', 'description', 'remarks', 'created_at'],
  income: ['id', 'received_on', 'category', 'amount', 'mode', 'remarks', 'created_at'],
  maintenance_rates: ['month', 'amount'],
  closed_months: ['month', 'closing_cash', 'closing_bank', 'closed_at'],
  notices: ['id', 'title', 'created_on'],
  settings: ['id', 'opening_cash', 'opening_bank'],
  users: ['username', 'role', 'flat_id', 'temp_password', 'password_hash', 'salt', 'email', 'email_verified'],
  maintenance_log: ['id', 'logged_on', 'details', 'status', 'created_at'],
  celebrations: ['id', 'kind', 'flat_id', 'entry_on', 'amount', 'details', 'created_at'],
  complaints: ['id', 'flat_no', 'title', 'details', 'status', 'created_at', 'updated_at', 'photos'],
  gallery: ['id', 'title', 'photo', 'uploaded_by', 'created_at', 'kind', 'name', 'folder'],
  file_data: ['file_id', 'part', 'mime', 'data'],
  login_log: ['username', 'role', 'login_at', 'logout_at', 'last_seen', 'minutes', 'device'],
  meetings: ['id', 'title', 'on_date', 'at_time', 'place', 'kind', 'created_at'],
  polls: ['id', 'question', 'options', 'status', 'created_at'],
  votes: ['id', 'poll_id', 'flat_no', 'choice', 'created_at'],
  visitors: ['id', 'visit_on', 'count', 'created_at'],
  status: ['item', 'state', 'updated_on']
};
const TEXT_COLS = ['month', 'paid_on', 'spent_on', 'received_on', 'created_on', 'created_at', 'closed_at',
                   'flat_no', 'username', 'temp_password', 'password_hash', 'salt', 'email', 'email_verified', 'photos', 'photo', 'file_id', 'data', 'login_at', 'logout_at', 'last_seen', 'logged_on', 'entry_on', 'visit_on', 'on_date', 'at_time', 'updated_at', 'updated_on', 'item', 'options', 'choice'];
const STR_COLS = ['flat_no', 'username', 'temp_password'];
const W = ['admin', 'treasurer', 'secretary'], N = ['admin', 'president', 'secretary'], A = ['admin', 'treasurer'];
const ALL = ['admin', 'treasurer', 'secretary', 'president', 'executive', 'resident'], S = ['admin', 'treasurer', 'secretary', 'president'];
const RULES = {
  complaints: { insert: ALL, update: S, delete: S }, meetings: { insert: N, delete: N },
  polls: { insert: N, update: N, delete: N }, gallery: { insert: N, delete: N }, votes: { insert: ALL }, status: { upsert: W },
  payments: { insert: W }, expenses: { insert: W, delete: A }, income: { insert: W, delete: A },
  maintenance_rates: { upsert: W }, closed_months: { insert: W, delete: ['admin'] },
  notices: { insert: N, delete: N }, settings: { update: A },
  maintenance_log: { insert: W, update: W, delete: W }, celebrations: { insert: W, delete: A },
  visitors: { insert: W, delete: W }
};
const DATE_OF = { payments: ['paid_on', 'month'], expenses: ['spent_on'], income: ['received_on'], maintenance_rates: ['month'] };

/* ---------- one-time setup: creates the tabs and starter data ---------- */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABLES).forEach(t => {
    const cols = TABLES[t], sh = ss.getSheetByName(t) || ss.insertSheet(t);
    if (sh.getLastRow() === 0) { sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold'); sh.setFrozenRows(1); }
    cols.forEach((c, i) => { if (TEXT_COLS.indexOf(c) >= 0) sh.getRange(1, i + 1, sh.getMaxRows(), 1).setNumberFormat('@'); });
  });
  const first = ss.getSheetByName('Sheet1'); if (first && first.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(first);
  if (!read_('flats').length) {
    ['101', '102', '201', '202', '301', '302', '401', '402', '501', '502'].forEach((n, i) => {
      sh_('flats').appendRow([i + 1, n, 1000]);
      sh_('users').appendRow([n, 'resident', i + 1, '123456', '', '', '', '']);
    });
    sh_('users').appendRow(['1234', 'admin', '', '987654', '', '', '', '']);
  }
  if (!read_('settings').length) sh_('settings').appendRow([1, 0, 0]);
  upgradeUsers();
  Logger.log('Setup done. Now: Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).');
}

/* Adds the 'email' and 'email_verified' columns to an existing users tab (safe to run many times). */
function upgradeUsers() {
  Object.keys(TABLES).forEach(t => {
    const sh = sh_(t); if (!sh) return;
    const have = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
    TABLES[t].forEach((c, i) => { if (have.indexOf(c) < 0) sh.getRange(1, i + 1).setValue(c).setFontWeight('bold'); });
  });
  const sh = sh_('users'); if (!sh) return;
  const want = TABLES.users, have = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
  want.forEach((c, i) => { if (have.indexOf(c) < 0) sh.getRange(1, i + 1).setValue(c).setFontWeight('bold'); });
  [7, 8].forEach(n => sh.getRange(1, n, sh.getMaxRows(), 1).setNumberFormat('@'));
}
/* Run ONCE by hand and click Allow: lets the script send e-mails from your Gmail (needed for codes). */
function authorizeMail() { Logger.log('Mail quota left today: ' + MailApp.getRemainingDailyQuota()); }

/* Run once by hand: adds sign-in IDs for secretary, treasurer, executive (and president) if they are missing.
   Each gets a random starting password, shown in View > Logs. They must change it on first sign-in. */
function addCommittee() {
  const have = read_('users').map(u => String(u.username).trim().toLowerCase());
  ['secretary', 'treasurer', 'executive', 'president'].forEach(role => {
    if (have.indexOf(role) >= 0) { Logger.log(role + ': already exists, skipped'); return; }
    const pw = String(100000 + Math.floor(Math.random() * 900000));
    sh_('users').appendRow([role, role, '', pw, '', '', '', '']);
    Logger.log(role + ': ID = ' + role + ' | starting password = ' + pw);
  });
  }

/* ---------- web endpoint ---------- */
function doGet() { return ContentService.createTextOutput('Krishna Kuteer API is running'); }
function doPost(e) {
  let out;
  try { out = route_(JSON.parse(e.postData.contents)); } catch (err) { out = { error: { message: 'Server error: ' + err.message } }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
function route_(b) {
  if (b.a === 'login') return login_(b);
  if (b.a === 'fpSend' || b.a === 'fpReset') {
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try { return b.a === 'fpSend' ? fpSend_(b) : fpReset_(b); } finally { lock.releaseLock(); }
  }
  const u = session_(b.token);
  if (!u) return { auth: true, error: { message: 'Session expired. Please sign in again.' } };
  if (b.a === 'me') return { user: pub_(u) };
  if (b.a === 'snapshot') return { data: snapshot_(u) };
  if (b.a === 'logout') { logTouch_(b.token, true); CacheService.getScriptCache().remove('t_' + b.token); return { ok: true }; }
  logTouch_(b.token, false);
  if (b.a === 'upload') return upload_(u, b);
  if (b.a === 'photo') return photo_(u, b);
  if (b.a === 'emailSend') return emailSend_(u, b);
  if (b.a === 'emailVerify') { const lock = LockService.getScriptLock(); lock.waitLock(20000); try { return emailVerify_(u, b); } finally { lock.releaseLock(); } }
  if (b.a === 'write' && !verified_(u)) return { error: { message: 'Please verify your e-mail first.' } };
  if (b.a === 'pw' || b.a === 'write') {
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      if (b.a === 'pw') return pw_(u, b);
      let r;
      try { r = write_(u, b); } finally { cacheDrop_('snap'); }
      if (r && r.ok) r.snapshot = snapshot_(u);
      return r;
    } finally { lock.releaseLock(); }
  }
  return { error: { message: 'Unknown request' } };
}

/* ---------- sheet helpers ---------- */
let SS_ = null, TZ_ = null;
const ss_ = () => SS_ || (SS_ = SpreadsheetApp.getActiveSpreadsheet());
const tz_ = () => TZ_ || (TZ_ = ss_().getSpreadsheetTimeZone());
const sh_ = t => ss_().getSheetByName(t);

/* ---------- cache (big values are split in chunks: 100 KB limit per key) ---------- */
const CHUNK_ = 30000, SNAP_TTL = 900, USER_TTL = 900;
function cacheGetBig_(name) {
  const c = CacheService.getScriptCache(), meta = c.get(name + '_meta');
  if (!meta) return null;
  try {
    const m = JSON.parse(meta), keys = [];
    for (let i = 0; i < m.n; i++) keys.push(name + '_' + m.v + '_' + i);
    const got = c.getAll(keys); let str = '';
    for (let i = 0; i < keys.length; i++) { if (got[keys[i]] == null) return null; str += got[keys[i]]; }
    return JSON.parse(str);
  } catch (e) { return null; }
}
function cachePutBig_(name, obj, ttl) {
  try {
    const c = CacheService.getScriptCache(), str = JSON.stringify(obj), v = Date.now(), n = Math.ceil(str.length / CHUNK_), kv = {};
    for (let i = 0; i < n; i++) kv[name + '_' + v + '_' + i] = str.substr(i * CHUNK_, CHUNK_);
    c.putAll(kv, ttl);
    c.put(name + '_meta', JSON.stringify({ v: v, n: n }), ttl);
  } catch (e) { /* too big or cache busy: just skip caching */ }
}
const cacheDrop_ = name => CacheService.getScriptCache().remove(name + '_meta');
/* Run this by hand after editing the Sheet directly, to see your edits immediately. */
function clearCache() { cacheDrop_('snap'); Logger.log('Cache cleared.'); }
function read_(t) {
  const sh0 = sh_(t); if (!sh0) return [];
  const v = sh0.getDataRange().getValues(), h = v[0], tz = tz_();
  return v.slice(1).map((r, i) => {
    const o = { __r: i + 2 };
    h.forEach((k, j) => {
      let x = r[j];
      if (x instanceof Date) x = Utilities.formatDate(x, tz, k === 'created_at' || k === 'closed_at' ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
      o[k] = x === '' ? null : (STR_COLS.indexOf(k) >= 0 ? String(x) : x);
    });
    return o;
  }).filter(o => TABLES[t].some(k => o[k] !== null));
}
const clean_ = rows => rows.map(r => { const o = Object.assign({}, r); delete o.__r; return o; });
const nextId_ = (t, c) => read_(t).reduce((m, r) => Math.max(m, +r[c] || 0), 0) + 1;
const now_ = () => Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm');

/* ---------- login / sessions ---------- */
const hash_ = (p, salt) => Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + p));
const pub_ = u => ({ id: u.username, email: u.username + '@krishnakuteer.app', real_email: u.email || '', email_ok: String(u.email_verified).toLowerCase() === 'yes' && !!u.email, role: u.role, flat: u.flat_id, pw_changed: !!u.password_hash });
function findUser_(name) {
  name = String(name || '').trim().toLowerCase().replace(/@krishnakuteer\.app$/, '');
  const u = read_('users').filter(x => String(x.username).trim().toLowerCase() === name)[0] || null;
  if (u) u.role = String(u.role || '').trim().toLowerCase(); /* 'Resident ' / 'ADMIN' still work */
  return u;
}
function login_(b) {
  const cache = CacheService.getScriptCache(), key = 'f_' + String(b.u).toLowerCase(), fails = +cache.get(key) || 0;
  if (fails >= 8) return { error: { message: 'Too many wrong attempts. Please wait 10 minutes and try again.' } };
  const u = findUser_(b.u), p = String(b.p || '');
  const ok = u && (u.password_hash ? hash_(p, u.salt) === u.password_hash : (u.temp_password && String(u.temp_password) === p));
  if (!ok) { cache.put(key, String(fails + 1), 600); return { error: { message: 'Invalid login credentials' } }; }
  cache.remove(key);
  const token = Utilities.getUuid() + Utilities.getUuid();
  cache.put('t_' + token, u.username, 21600);
  let snap = null;
  try { snap = snapshot_(u); } catch (e) { /* app will fetch it separately */ }
  logIn_(token, u, b);
  return { token: token, user: pub_(u), snapshot: snap };
}
function session_(token) {
  if (!token) return null;
  const c = CacheService.getScriptCache(), name = c.get('t_' + token);
  if (!name) return null;
  const key = 'u_' + String(name).toLowerCase(), hit = c.get(key);
  if (hit) { try { return JSON.parse(hit); } catch (e) { /* fall through */ } }
  const u = findUser_(name);
  if (u) c.put(key, JSON.stringify({ username: u.username, role: u.role, flat_id: u.flat_id, password_hash: u.password_hash ? '1' : null, email: u.email || '', email_verified: u.email_verified || '', __r: u.__r }), USER_TTL);
  return u;
}
function pw_(u, b) {
  const p = String(b.password || '');
  if (p.length < 6) return { error: { message: 'Password must be at least 6 characters.' } };
  const salt = Utilities.getUuid(), sh = sh_('users'), h = TABLES.users;
  sh.getRange(u.__r, h.indexOf('password_hash') + 1).setValue(hash_(p, salt));
  sh.getRange(u.__r, h.indexOf('salt') + 1).setValue(salt);
  sh.getRange(u.__r, h.indexOf('temp_password') + 1).setValue('');
  CacheService.getScriptCache().remove('u_' + String(u.username).toLowerCase());
  return { ok: true };
}

/* ---------- e-mail verification + forgot password (codes are e-mailed from your Gmail) ---------- */
const CODE_TTL = 600, MAX_TRIES = 5, MAX_SENDS = 3;
const validEmail_ = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120;
const mask_ = e => { const p = String(e).split('@'); return p[0].slice(0, 2) + '***@' + p[1]; };
function newCode_() { return String(100000 + parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 8), 16) % 900000); }
function sendMail_(to, subject, body) {
  MailApp.sendEmail({ to: to, subject: subject, body: body, name: 'Krishna Kuteer Apartment', noReply: true });
}
/* limits sends per ID: 3 codes per hour */
function sendLimit_(kind, name) {
  const c = CacheService.getScriptCache(), k = 'sc_' + kind + '_' + String(name).toLowerCase(), n = +c.get(k) || 0;
  if (n >= MAX_SENDS) return false;
  c.put(k, String(n + 1), 3600); return true;
}
function storeCode_(key, code, extra) {
  const salt = Utilities.getUuid();
  CacheService.getScriptCache().put(key, JSON.stringify(Object.assign({ h: hash_(code, salt), s: salt, n: 0 }, extra || {})), CODE_TTL);
}
/* returns {ok:true, data} or {error} ; counts wrong tries and burns the code after 5 */
function checkCode_(key, code) {
  const c = CacheService.getScriptCache(), raw = c.get(key);
  if (!raw) return { error: 'This code has expired. Please ask for a new one.' };
  const d = JSON.parse(raw);
  if (hash_(String(code || '').trim(), d.s) !== d.h) {
    d.n++; if (d.n >= MAX_TRIES) { c.remove(key); return { error: 'Too many wrong codes. Please ask for a new one.' }; }
    c.put(key, JSON.stringify(d), CODE_TTL); return { error: 'Wrong code. Please check and try again.' };
  }
  c.remove(key); return { ok: true, data: d };
}
function emailSend_(u, b) {
  const email = String(b.email || '').trim().toLowerCase();
  if (!validEmail_(email)) return { error: { message: 'Please enter a valid e-mail address.' } };
  if (!sendLimit_('ev', u.username)) return { error: { message: 'Too many codes requested. Please try again after an hour.' } };
  const code = newCode_(); storeCode_('ev_' + String(u.username).toLowerCase(), code, { e: email });
  try { sendMail_(email, 'Krishna Kuteer - verify your e-mail', 'Your verification code is ' + code + '\n\nIt works for 10 minutes. If you did not ask for this, ignore this e-mail.'); }
  catch (err) { return { error: { message: 'Could not send the e-mail. (Admin: run authorizeMail in Apps Script and deploy a New version.)' } }; }
  return { ok: true };
}
function emailVerify_(u, b) {
  const r = checkCode_('ev_' + String(u.username).toLowerCase(), b.code);
  if (r.error) return { error: { message: r.error } };
  const sh = sh_('users'), h = TABLES.users;
  sh.getRange(u.__r, h.indexOf('email') + 1).setValue(r.data.e);
  sh.getRange(u.__r, h.indexOf('email_verified') + 1).setValue('yes');
  CacheService.getScriptCache().remove('u_' + String(u.username).toLowerCase());
  return { ok: true, email: r.data.e };
}
/* Forgot password step 1: e-mail a code to the VERIFIED address saved for this ID */
function fpSend_(b) {
  const u = findUser_(b.u), generic = { ok: true };
  if (!u) return { error: { message: 'Please select your ID.' } };
  if (!u.email || String(u.email_verified).toLowerCase() !== 'yes')
    return { error: { message: 'No verified e-mail is saved for this ID. Please ask the admin to reset your password.' } };
  if (!sendLimit_('fp', u.username)) return { error: { message: 'Too many codes requested. Please try again after an hour.' } };
  const code = newCode_(); storeCode_('fp_' + String(u.username).toLowerCase(), code);
  try { sendMail_(u.email, 'Krishna Kuteer - password reset code', 'Your password reset code is ' + code + '\n\nIt works for 10 minutes. If you did not ask for this, ignore this e-mail; your password is unchanged.'); }
  catch (err) { return { error: { message: 'Could not send the e-mail. Please contact the admin.' } }; }
  return { ok: true, masked: mask_(u.email) };
}
/* Forgot password step 2: check code, set new password */
function fpReset_(b) {
  const u = findUser_(b.u), p = String(b.password || '');
  if (!u) return { error: { message: 'Please select your ID.' } };
  if (p.length < 6) return { error: { message: 'Password must be at least 6 characters.' } };
  const r = checkCode_('fp_' + String(u.username).toLowerCase(), b.code);
  if (r.error) return { error: { message: r.error } };
  const r2 = pw_(u, { password: p }); CacheService.getScriptCache().remove('f_' + String(u.username).toLowerCase());
  return r2;
}

/* ---------- login activity log (tab 'login_log'): who signed in, when, how long. Passwords are never stored. ---------- */
function logIn_(token, u, b) {
  try {
    const sh = sh_('login_log'); if (!sh) return;
    const lock = LockService.getScriptLock(); lock.waitLock(5000);
    try { sh.appendRow([u.username, u.role, now_(), '', now_(), 0, String(b.dev || '').slice(0, 60)]); CacheService.getScriptCache().put('ls_' + token, JSON.stringify({ r: sh.getLastRow(), s: Date.now() }), 21600); }
    finally { lock.releaseLock(); }
  } catch (e) { /* logging must never block sign-in */ }
}
function logTouch_(token, out) {
  try {
    const c = CacheService.getScriptCache(), raw = c.get('ls_' + token); if (!raw || (!out && c.get('lt_' + token))) return;
    const d = JSON.parse(raw), sh = sh_('login_log'); if (!sh) return;
    sh.getRange(d.r, 4, 1, 3).setValues([[out ? now_() : '', now_(), Math.round((Date.now() - d.s) / 6000) / 10]]);
    if (!out) { sh.getRange(d.r, 4).clearContent(); c.put('lt_' + token, '1', 300); }
  } catch (e) {}
}

/* ---------- photos + PDFs: stored INSIDE the Google Sheet (tab 'file_data'), max 1 MB each, in 45,000-character pieces ---------- */
const FOLDERS = ['Agenda & M.O.M', 'Apartment Works', 'Association', 'Electricity', 'Generator', 'GHMC & Plumber', 'Lift', 'Monthly Register', 'Watchmen Salary', 'Water (HMWSSB) & Water Related', 'Other'];
const ROOT_FOLDER = 'Krishna Kuteer Apartment Documents';
const MAX_BYTES = 1000000, PIECE = 45000;
function upload_(u, b) {
  const err = m => ({ error: { message: m } });
  if (!verified_(u)) return err('Please verify your e-mail first.');
  if (b.kind === 'gallery' ? ['admin', 'president', 'secretary'].indexOf(u.role) < 0 : b.kind !== 'complaint') return err('You do not have permission to do this.');
  const m = /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+\/=]+)$/.exec(String(b.img || ''));
  if (!m) return err('Please choose a photo or a PDF file.');
  if (m[1] === 'application/pdf' && b.kind !== 'gallery') return err('PDF files are not allowed here.');
  if (m[2].length * 0.75 > MAX_BYTES) return err('File must be under 1 MB.');
  const sh = sh_('file_data'); if (!sh) return err('Run setup() once in Apps Script to create the new tabs.');
  const id = 'f' + Utilities.getUuid().replace(/-/g, ''), rows = [];
  for (let i = 0, n = 1; i < m[2].length; i += PIECE, n++) rows.push([id, n, m[1], m[2].slice(i, i + PIECE)]);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const start = Math.max(sh.getLastRow(), 1) + 1, need = start + rows.length - 1 - sh.getMaxRows();
    if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need);
    sh.getRange(start, 1, rows.length, 4).setValues(rows);
  } finally { lock.releaseLock(); }
  CacheService.getScriptCache().put('up_' + id, String(u.username), 7200);
  return { ok: true, id: id };
}
function fileRows_(id) {
  const sh = sh_('file_data'); if (!sh || !/^f[0-9a-f]{32}$/.test(id)) return null;
  const hits = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).createTextFinder(id).matchEntireCell(true).findAll().map(r => r.getRow()).sort((x, y) => x - y);
  return hits.length ? { sh: sh, first: hits[0], n: hits.length } : null;
}
function delFile_(id) { try { const f = fileRows_(id); if (f) f.sh.deleteRows(f.first, f.n); } catch (e) {} }
function photo_(u, b) {
  const id = String(b.id || ''), T = tables_(), S4 = ['admin', 'treasurer', 'secretary', 'president'];
  if (!verified_(u)) return { error: { message: 'Photo not available.' } };
  const ok = T.gallery.some(r => String(r.photo) === id) ||
    T.complaints.some(r => String(r.photos || '').split('|').indexOf(id) >= 0 && (S4.indexOf(u.role) >= 0 || String(r.flat_no).toLowerCase() === String(u.username).toLowerCase()));
  const f = ok && fileRows_(id);
  if (!f) return { error: { message: 'Photo not available.' } };
  const v = f.sh.getRange(f.first, 3, f.n, 2).getValues();
  return { ok: true, img: 'data:' + v[0][0] + ';base64,' + v.map(r => r[1]).join('') };
}

/* ---------- reading ---------- */
function tables_() {
  const hit = cacheGetBig_('snap');
  if (hit) return hit;
  const T = {};
  ['flats', 'payments', 'expenses', 'income', 'maintenance_rates', 'closed_months', 'notices', 'settings', 'maintenance_log', 'celebrations', 'visitors', 'complaints', 'gallery', 'meetings', 'polls', 'votes', 'status'].forEach(t => T[t] = clean_(read_(t)));
  cachePutBig_('snap', T, SNAP_TTL);
  return T;
}
/* E-mail verification is OPTIONAL: everybody may use the site without it (it is only needed for 'Forgot password'). */
const verified_ = u => true;
function snapshot_(u) {
  if (!verified_(u)) return { me: pub_(u) }; /* e-mail is optional */
  const T = Object.assign({}, tables_());
  T.me = pub_(u);
  const mine = String(u.username).toLowerCase();
  if (u.role === 'resident') T.complaints = T.complaints.filter(c => String(c.flat_no).toLowerCase() === mine);
  T.votes = T.votes.map(v => ({ poll_id: v.poll_id, choice: v.choice, mine: String(v.flat_no).toLowerCase() === mine })); /* ballots stay anonymous */
  T.profiles = [{ id: u.username, role: u.role, flat_id: u.flat_id }];
  T.balance = u.role === 'resident' ? [] : [balance_(T)];
  return T;
}
function balance_(T) {
  const s = T.settings[0] || {}, k = r => (r.mode || 'cash') === 'cash' ? 'cash' : 'bank';
  const v = { cash: +s.opening_cash || 0, bank: +s.opening_bank || 0 }, open = v.cash + v.bank;
  let rec = 0, spent = 0;
  T.payments.forEach(p => { v[k(p)] += +p.amount; rec += +p.amount; });
  T.income.filter(i => i.category === 'other').forEach(p => { v[k(p)] += +p.amount; rec += +p.amount; });
  T.expenses.forEach(p => { v[k(p)] -= +p.amount; spent += +p.amount; });
  return { opening_balance: open, received: rec, spent: spent, cash: v.cash, bank: v.bank, closing: v.cash + v.bank };
}

/* ---------- writing (permissions + month locks enforced here) ---------- */
function write_(u, b) {
  const t = b.t, op = b.op, allowed = RULES[t] && RULES[t][op], err = m => ({ error: { message: m } });
  if (!allowed || allowed.indexOf(u.role) < 0) return err('You do not have permission to do this.');
  const closed = read_('closed_months').map(r => String(r.month).slice(0, 7));
  const locked = d => d && closed.indexOf(String(d).slice(0, 7)) >= 0;
  const LOCKMSG = 'This month is locked. Nothing can be added, changed or deleted in it.';
  const cols = TABLES[t], sh = sh_(t), p = b.payload || {};
  const find = () => read_(t).filter(r => (b.filters || []).every(f => String(r[f[0]]) === String(f[1])));

  if (!sh) return err('Run setup() once in Apps Script to create the new tabs.');
  if (t === 'complaints') {
    if (op === 'insert') { if (!String(p.title || '').trim()) return err('Please describe the problem.'); p.flat_no = u.username; p.status = 'open'; p.updated_at = now_(); }
    if (op === 'update') { if (['open', 'in_progress', 'resolved'].indexOf(p.status) < 0) return err('Invalid status.'); p.updated_at = now_(); }
  }
  const mine = id => CacheService.getScriptCache().get('up_' + id) === String(u.username);
  if (t === 'complaints' && op === 'insert') {
    const ids = String(p.photos || '').split('|').filter(Boolean);
    if (ids.length > 3 || !ids.every(mine)) return err('Photo upload failed. Please try again.');
    p.photos = ids.join('|');
  }
  if (t === 'gallery' && op === 'insert') {
    if (!mine(String(p.photo || ''))) return err('Photo upload failed. Please try again.');
    p.title = String(p.title || '').slice(0, 120); p.uploaded_by = u.username; p.kind = p.kind === 'pdf' ? 'pdf' : 'photo'; p.name = String(p.name || '').slice(0, 120); p.folder = FOLDERS.indexOf(p.folder) >= 0 ? p.folder : 'Other';
  }
  if ((t === 'gallery' || t === 'complaints') && op === 'delete') find().forEach(r => String(r.photo || r.photos || '').split('|').filter(Boolean).forEach(delFile_));

  if (t === 'meetings' && op === 'insert' && (!String(p.title || '').trim() || !p.on_date || ['meeting', 'event'].indexOf(p.kind) < 0)) return err('Enter a title, date and type.');
  if (t === 'polls' && op === 'insert') {
    const o = String(p.options || '').split('|').map(x => x.trim()).filter(Boolean);
    if (!String(p.question || '').trim() || o.length < 2) return err('Enter a question and at least two options.');
    p.options = o.join('|'); p.status = 'open';
  }
  if (t === 'polls' && op === 'update' && ['open', 'closed'].indexOf(p.status) < 0) return err('Invalid status.');
  if (t === 'votes') {
    const poll = read_('polls').filter(r => String(r.id) === String(p.poll_id))[0];
    if (!poll || poll.status !== 'open') return err('This poll is closed.');
    if (String(poll.options).split('|').indexOf(String(p.choice)) < 0) return err('Choose one of the options.');
    if (read_('votes').some(v => String(v.poll_id) === String(p.poll_id) && String(v.flat_no).toLowerCase() === String(u.username).toLowerCase())) return err('You have already voted in this poll.');
    p.flat_no = u.username;
  }
  if (t === 'status' && ['active', 'attention', 'maintenance'].indexOf(p.state) < 0) return err('Invalid status.');
  if (t === 'maintenance_log' && p.status != null && ['completed', 'pending', 'partial'].indexOf(p.status) < 0) return err('Invalid status.');
  if (t === 'visitors' && op === 'insert' && (!p.visit_on || !(Math.floor(+p.count) >= 1 && +p.count <= 100000))) return err('Enter a date and a visitor count of at least 1.');
  if (t === 'celebrations' && op === 'insert' && ['income', 'expense', 'sponsor'].indexOf(p.kind) < 0) return err('Invalid entry type.');
  if (op === 'insert' || op === 'upsert') {
    if (t !== 'closed_months' && (DATE_OF[t] || []).some(c => locked(p[c]))) return err(LOCKMSG);
    if (['payments', 'expenses', 'income', 'celebrations'].indexOf(t) >= 0 && !(t === 'celebrations' && p.kind === 'sponsor') && !(+p.amount > 0)) return err('Enter an amount above 0.');
    if (t === 'closed_months' && closed.indexOf(String(p.month).slice(0, 7)) >= 0) return err('This month is already closed.');
  }
  if (op === 'insert') {
    const rec = Object.assign({}, p);
    if (cols.indexOf('id') >= 0) rec.id = nextId_(t, 'id');
    if (t === 'payments') rec.receipt_no = nextId_(t, 'receipt_no');
    if (cols.indexOf('created_at') >= 0) rec.created_at = now_();
    if (t === 'notices') rec.created_on = now_().slice(0, 10);
    if (t === 'closed_months') rec.closed_at = now_();
    sh.appendRow(cols.map(c => rec[c] == null ? '' : rec[c]));
    if (t === 'gallery' || t === 'complaints') { try { autoDrive_(t, rec); } catch (e) { Logger.log('Drive save failed: ' + e); } }
    return { ok: true };
  }
  if (op === 'upsert') {
    const key = b.onConflict, hit = read_(t).filter(r => String(r[key]) === String(p[key]))[0];
    if (!hit) { sh.appendRow(cols.map(c => p[c] == null ? '' : p[c])); return { ok: true }; }
    cols.forEach((c, i) => { if (p[c] != null && c !== key) sh.getRange(hit.__r, i + 1).setValue(p[c]); });
    return { ok: true };
  }
  if (op === 'update') {
    const rows = find(); if (!rows.length) return err('Record not found.');
    rows.forEach(r => cols.forEach((c, i) => { if (p[c] != null && c !== 'id') sh.getRange(r.__r, i + 1).setValue(p[c]); }));
    return { ok: true };
  }
  if (op === 'delete') {
    const rows = find();
    if (rows.some(r => (DATE_OF[t] || []).some(c => locked(r[c])))) return err(LOCKMSG);
    rows.map(r => r.__r).sort((x, y) => y - x).forEach(n => sh.deleteRow(n));
    return { ok: true };
  }
  return err('Unsupported action.');
}


/* ---------- SPEED: keep the backend warm (run installKeepWarm ONCE) ----------
   Google puts idle scripts to sleep, which makes the first tap slow. This trigger wakes it every 5 minutes
   and refreshes the cached data, so residents always get a fast answer. Sheet edits by hand show within 5 minutes. */
function keepWarm() { cacheDrop_('snap'); tables_(); }
function installKeepWarm() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'keepWarm').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('keepWarm').timeBased().everyMinutes(5).create();
  keepWarm();
  Logger.log('Done. The backend will now stay warm (runs every 5 minutes).');
}
function removeKeepWarm() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'keepWarm').forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('Keep-warm trigger removed.');
}


/* =====================================================================================
   EXPORT ALL FILES TO GOOGLE DRIVE  (run `exportToDrive` once; safe to run again, it skips files already saved)
   Creates "Krishna Kuteer Apartment Documents" in your My Drive with one sub-folder per category.
   Complaint photos go into the "Other" folder, named "Complaint 12 - Flat 101 - title".
   ===================================================================================== */
function onOpen() {
  try { SpreadsheetApp.getUi().createMenu('Krishna Kuteer').addItem('Export all files to Drive', 'exportToDrive').addToUi(); } catch (e) {}
}
/* Every new Document / photo / complaint picture is ALSO saved to Google Drive straight away (same names as exportToDrive, so nothing is duplicated). */
function driveDirs_() {
  const it = DriveApp.getFoldersByName(ROOT_FOLDER), root = it.hasNext() ? it.next() : DriveApp.createFolder(ROOT_FOLDER), dirs = {};
  FOLDERS.forEach(n => dirs[n] = driveFolder_(root, safeName_(n)));
  return dirs;
}
function driveSave_(folder, base, id) {
  const probe = fileRows_(id); if (!probe) return;
  const mime = probe.sh.getRange(probe.first, 3).getValue(), name = safeName_(base) + (EXT_[mime] || '');
  if (folder.getFilesByName(name).hasNext()) return;
  const blob = fileBlob_(id, name); if (blob) folder.createFile(blob);
}
function autoDrive_(t, rec) {
  const dirs = driveDirs_();
  if (t === 'gallery') {
    const d = String(rec.created_at).slice(0, 10);
    driveSave_(dirs[FOLDERS.indexOf(rec.folder) >= 0 ? rec.folder : 'Other'], (rec.title || rec.name || 'file') + ' (' + d + ') #' + rec.id, String(rec.photo));
  } else {
    String(rec.photos || '').split('|').filter(Boolean).forEach((id, i) =>
      driveSave_(dirs['Other'], 'Complaint ' + rec.id + ' - Flat ' + rec.flat_no + ' - ' + (rec.title || '') + ' (' + (i + 1) + ')', id));
  }
}
/* Run ONCE by hand and click Allow: gives the script permission to save files in your Google Drive. */
function authorizeDrive() { Logger.log('Drive folder: ' + DriveApp.getFoldersByName(ROOT_FOLDER).hasNext()); driveDirs_(); Logger.log('Drive is ready.'); }
function driveFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function safeName_(x) { return String(x || '').replace(/[\\/:*?"<>|#]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'file'; }
function fileBlob_(id, name) {
  const f = fileRows_(id); if (!f) return null;
  const v = f.sh.getRange(f.first, 3, f.n, 2).getValues();
  return Utilities.newBlob(Utilities.base64Decode(v.map(r => r[1]).join('')), v[0][0], name);
}
const EXT_ = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };
function exportToDrive() {
  const t0 = Date.now(), rootIt = DriveApp.getFoldersByName(ROOT_FOLDER), root = rootIt.hasNext() ? rootIt.next() : DriveApp.createFolder(ROOT_FOLDER);
  const dirs = {}; FOLDERS.forEach(n => dirs[n] = driveFolder_(root, safeName_(n)));
  let saved = 0, skipped = 0, missing = 0, stopped = false;
  const put = (folder, base, id) => {
    if (stopped) return;
    if (Date.now() - t0 > 270000) { stopped = true; return; }
    const sh = sh_('file_data'), probe = fileRows_(id);
    if (!probe) { missing++; return; }
    const mime = sh.getRange(probe.first, 3).getValue(), name = safeName_(base) + (EXT_[mime] || '');
    if (folder.getFilesByName(name).hasNext()) { skipped++; return; }
    const blob = fileBlob_(id, name); if (!blob) { missing++; return; }
    folder.createFile(blob); saved++;
  };
  read_('gallery').forEach(g => {
    const d = String(g.created_at).slice(0, 10);
    put(dirs[FOLDERS.indexOf(g.folder) >= 0 ? g.folder : 'Other'], (g.title || g.name || 'file') + ' (' + d + ') #' + g.id, String(g.photo));
  });
  read_('complaints').forEach(c => String(c.photos || '').split('|').filter(Boolean).forEach((id, i) =>
    put(dirs['Other'], 'Complaint ' + c.id + ' - Flat ' + c.flat_no + ' - ' + (c.title || '') + ' (' + (i + 1) + ')', id)));
  const msg = (stopped ? 'Time limit reached - run exportToDrive again to continue.\n' : 'Export finished.\n') +
    'Saved: ' + saved + ', already there: ' + skipped + ', not found: ' + missing + '\nDrive folder: ' + root.getUrl();
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}
