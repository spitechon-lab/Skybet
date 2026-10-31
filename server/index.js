import express from 'express'; import http from 'http'; import cors from 'cors';
import { Server } from 'socket.io'; import Database from 'better-sqlite3';
import tinypesa from './tinypesa-routes.js'; import path from 'path'; import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken'; import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();
const MIN_BET = 100, MAX_BET = 10_000_00;           // cents
const REFERRAL_RATE = 0.05;                          // paid once, on referee's first deposit
const db = new Database(process.env.DB_PATH || 'skybet.db'); db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE, username TEXT UNIQUE, pass TEXT,
  ref_code TEXT UNIQUE, referred_by INTEGER, balance INTEGER DEFAULT 0, is_admin INTEGER DEFAULT 0,
  dob TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS tx(id INTEGER PRIMARY KEY, user_id INTEGER, type TEXT, amount INTEGER,
  status TEXT DEFAULT 'done', note TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS rounds(id INTEGER PRIMARY KEY, seed TEXT, hash TEXT, crash REAL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS bets(id INTEGER PRIMARY KEY, round_id INTEGER, user_id INTEGER, amount INTEGER,
  cashout REAL, payout INTEGER DEFAULT 0);`);

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const publicUser = u => ({ id: u.id, email: u.email, username: u.username, balance: u.balance, refCode: u.ref_code, isAdmin: !!u.is_admin });
const getUser = id => db.prepare('SELECT * FROM users WHERE id=?').get(id);
const sign = u => jwt.sign({ id: u.id }, SECRET, { expiresIn: '7d' });
const credit = db.transaction((uid, amt, type, note, status = 'done') => {
  db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(amt, uid);
  db.prepare('INSERT INTO tx(user_id,type,amount,status,note) VALUES(?,?,?,?,?)').run(uid, type, amt, status, note || null);
});

const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const app = express(); app.use(cors()); app.use(express.json());
const auth = (req, res, next) => {
  try { req.user = getUser(jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET).id); if (!req.user) throw 0; next(); }
  catch { res.status(401).json({ error: 'Please log in again.' }); }
};
const adminOnly = (req, res, next) => req.user.is_admin ? next() : res.status(403).json({ error: 'Admins only.' });
const cents = v => { const n = Math.round(Number(v) * 100); return Number.isFinite(n) ? n : NaN; };

app.post('/api/register', async (req, res) => {
  const { email = '', username = '', password = '', dob = '', ref = '' } = req.body;
  if (!/^\S+@\S+\.\S+$/.test(email) || username.length < 3 || password.length < 8) return res.status(400).json({ error: 'Use a valid email, a username of 3+ characters and a password of 8+ characters.' });
  const age = (Date.now() - new Date(dob)) / 3.15576e10;
  if (!(age >= 18)) return res.status(400).json({ error: 'You must be 18 or older to register.' });
  const referrer = ref ? db.prepare('SELECT id FROM users WHERE ref_code=?').get(ref.trim().toUpperCase()) : null;
  try {
    const info = db.prepare('INSERT INTO users(email,username,pass,ref_code,referred_by,is_admin,dob) VALUES(?,?,?,?,?,?,?)')
      .run(email.toLowerCase(), username, await bcrypt.hash(password, 10), crypto.randomBytes(4).toString('hex').toUpperCase(),
        referrer?.id || null, email.toLowerCase() === ADMIN_EMAIL ? 1 : 0, dob);
    const u = getUser(info.lastInsertRowid); res.json({ token: sign(u), user: publicUser(u) });
  } catch { res.status(409).json({ error: 'That email or username is already taken.' }); }
});
app.post('/api/login', async (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE email=? OR username=?').get(String(req.body.login || '').toLowerCase(), req.body.login);
  if (!u || !(await bcrypt.compare(req.body.password || '', u.pass))) return res.status(401).json({ error: 'Wrong login or password.' });
  res.json({ token: sign(u), user: publicUser(u) });
});
app.get('/api/me', auth, (req, res) => res.json(publicUser(req.user)));
app.get('/api/transactions', auth, (req, res) => res.json(db.prepare('SELECT * FROM tx WHERE user_id=? ORDER BY id DESC LIMIT 50').all(req.user.id)));
app.get('/api/bets', auth, (req, res) => res.json(db.prepare('SELECT * FROM bets WHERE user_id=? ORDER BY id DESC LIMIT 30').all(req.user.id)));
app.get('/api/referrals', auth, (req, res) => {
  const list = db.prepare('SELECT username, created_at FROM users WHERE referred_by=?').all(req.user.id);
  const earned = db.prepare("SELECT COALESCE(SUM(amount),0) s FROM tx WHERE user_id=? AND type='referral'").get(req.user.id).s;
  res.json({ code: req.user.ref_code, count: list.length, earned, list });
});

// Deposits: replace the "demo" branch with your payment provider (Stripe, Paystack, Flutterwave, M-Pesa...).
// Credit the wallet only from the provider's verified webhook, never from the browser.
app.post('/api/deposit', auth, (req, res) => {
  const amt = cents(req.body.amount);
  if (!(amt >= 500 && amt <= 1_000_000_00)) return res.status(400).json({ error: 'Deposit between 5.00 and 1,000,000.00.' });
  if (process.env.PAYMENTS !== 'demo') return res.status(501).json({ error: 'Payment provider not connected yet.' });
  const first = !db.prepare("SELECT 1 FROM tx WHERE user_id=? AND type='deposit'").get(req.user.id);
  credit(req.user.id, amt, 'deposit', 'demo payment');
  if (first && req.user.referred_by) credit(req.user.referred_by, Math.floor(amt * REFERRAL_RATE), 'referral', `Bonus from ${req.user.username}`);
  res.json(publicUser(getUser(req.user.id)));
});
app.post('/api/withdraw', auth, (req, res) => {
  const amt = cents(req.body.amount), dest = String(req.body.destination || '').trim();
  if (!(amt >= 500) || !dest) return res.status(400).json({ error: 'Enter an amount of 5.00 or more and a destination.' });
  try {
    db.transaction(() => {
      const r = db.prepare('UPDATE users SET balance=balance-? WHERE id=? AND balance>=?').run(amt, req.user.id, amt);
      if (!r.changes) throw new Error('Not enough balance.');
      db.prepare("INSERT INTO tx(user_id,type,amount,status,note) VALUES(?,?,?,?,?)").run(req.user.id, 'withdrawal', -amt, 'pending', dest);
    })();
    res.json(publicUser(getUser(req.user.id)));
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.get('/api/admin/withdrawals', auth, adminOnly, (req, res) =>
  res.json(db.prepare("SELECT tx.*, users.username FROM tx JOIN users ON users.id=tx.user_id WHERE type='withdrawal' AND status='pending'").all()));
app.post('/api/admin/withdrawals/:id/:action', auth, adminOnly, (req, res) => {
  const t = db.prepare("SELECT * FROM tx WHERE id=? AND type='withdrawal' AND status='pending'").get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found.' });
  db.transaction(() => {
    if (req.params.action === 'reject') db.prepare('UPDATE users SET balance=balance-? WHERE id=?').run(t.amount, t.user_id); // amount is negative => refund
    db.prepare('UPDATE tx SET status=? WHERE id=?').run(req.params.action === 'approve' ? 'done' : 'rejected', t.id);
  })();
  res.json({ ok: true });
});
app.get('/api/rounds', (req, res) => res.json(db.prepare('SELECT id,hash,seed,crash FROM rounds ORDER BY id DESC LIMIT 20').all()));


// ----- site, payments, sports data -----
app.use('/api/pay', tinypesa({ db, auth, credit, REFERRAL_RATE }));
app.get('/api/sports/fixtures', (req, res) => res.sendFile(path.join(PUB, 'fixtures.json')));   // swap for your licensed odds feed
app.use(express.static(PUB));

// ---------- Aviator engine ----------
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
io.use((s, next) => { try { s.data.uid = jwt.verify(s.handshake.auth.token, SECRET).id; next(); } catch { next(new Error('auth')); } });
io.on('connection', s => {
  s.join('u' + s.data.uid); s.emit('state', snapshot());
  s.on('bet', ({ amount, auto }, ack = () => {}) => {
    const amt = cents(amount);
    if (round.phase !== 'betting') return ack({ error: 'Betting is closed for this round.' });
    if (!(amt >= MIN_BET && amt <= MAX_BET)) return ack({ error: 'Bet between 1.00 and 10,000.00.' });
    if (round.bets.has(s.data.uid)) return ack({ error: 'You already have a bet in this round.' });
    const r = db.prepare('UPDATE users SET balance=balance-? WHERE id=? AND balance>=?').run(amt, s.data.uid, amt);
    if (!r.changes) return ack({ error: 'Not enough balance. Make a deposit first.' });
    db.prepare('INSERT INTO tx(user_id,type,amount,note) VALUES(?,?,?,?)').run(s.data.uid, 'bet', -amt, `round ${round.id}`);
    round.bets.set(s.data.uid, { amt, auto: Number(auto) > 1 ? Number(auto) : null, done: false, name: getUser(s.data.uid).username });
    sendBalance(s.data.uid); io.emit('bets', betList()); ack({ ok: true });
  });
  s.on('cashout', (_, ack = () => {}) => ack(cashOut(s.data.uid)));
});
const sendBalance = uid => io.to('u' + uid).emit('balance', getUser(uid).balance);
const betList = () => [...round.bets.values()].map(b => ({ name: b.name, amt: b.amt, at: b.at || null }));
const snapshot = () => ({ id: round.id, phase: round.phase, hash: round.hash, mult: round.mult, bets: betList(), history: db.prepare('SELECT crash FROM rounds ORDER BY id DESC LIMIT 15').all().map(r => r.crash) });

// Provably fair: the hash of the seed is shown before the round, the seed after. Anyone can recompute the crash point.
const crashPoint = seed => {
  const n = parseInt(crypto.createHmac('sha256', seed).update('skybet').digest('hex').slice(0, 13), 16), e = 2 ** 52;
  return n % 33 === 0 ? 1 : Math.floor((100 * e - n) / (e - n)) / 100;   // ~3% instant crash = house edge
};
function cashOut(uid) {
  const b = round.bets.get(uid);
  if (round.phase !== 'flying' || !b || b.done) return { error: 'Nothing to cash out.' };
  b.done = true; b.at = round.mult; b.payout = Math.floor(b.amt * round.mult);
  credit(uid, b.payout, 'win', `round ${round.id} @${round.mult}x`); sendBalance(uid); io.emit('bets', betList());
  return { ok: true, payout: b.payout };
}
let round;
function startRound() {
  const seed = crypto.randomBytes(16).toString('hex');
  round = { id: db.prepare('INSERT INTO rounds(seed,hash,crash) VALUES(?,?,?)').run(seed, sha(seed), crashPoint(seed)).lastInsertRowid,
    seed, hash: sha(seed), crash: crashPoint(seed), phase: 'betting', mult: 1, bets: new Map() };
  io.emit('state', snapshot());
  setTimeout(fly, 7000);
}
function fly() {
  round.phase = 'flying'; const t0 = Date.now(); io.emit('phase', 'flying');
  const timer = setInterval(() => {
    round.mult = Math.floor(Math.exp(0.00008 * (Date.now() - t0)) * 100) / 100;
    if (round.mult >= round.crash) {
      clearInterval(timer); round.mult = round.crash; round.phase = 'crashed';
      for (const [uid, b] of round.bets) db.prepare('INSERT INTO bets(round_id,user_id,amount,cashout,payout) VALUES(?,?,?,?,?)').run(round.id, uid, b.amt, b.done ? b.at : null, b.payout || 0);
      io.emit('crash', { mult: round.crash, seed: round.seed }); return setTimeout(startRound, 4000);
    }
    for (const [uid, b] of round.bets) if (!b.done && b.auto && round.mult >= b.auto) cashOut(uid);
    io.emit('tick', round.mult);
  }, 100);
}
startRound();
server.listen(process.env.PORT || 4000, () => console.log('SkyBet server on :' + (process.env.PORT || 4000)));
