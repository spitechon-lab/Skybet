// tinypesa-routes.js  (Express, ESM). Works with the server/index.js from skybet.zip.
//
// Mount it in server/index.js, after `credit`, `auth` and `db` are defined:
//   import tinypesa from './tinypesa-routes.js';
//   app.use('/api/pay', tinypesa({ db, auth, credit, REFERRAL_RATE }));
//
// .env (never commit, never put in index.html):
//   TINYPESA_API_KEY=your-key
//   PAY_CALLBACK_SECRET=a-long-random-string
//
// In your TinyPesa dashboard set the callback URL to:
//   https://YOUR-DOMAIN/api/pay/callback?s=<PAY_CALLBACK_SECRET>
//
// IMPORTANT: the TinyPesa endpoint path and the callback field names below are written from memory.
// Check them against TinyPesa's current docs before going live, and test with a KES 10 deposit.

import express from 'express';

const norm = p => '0' + String(p).replace(/[\s+-]/g, '').replace(/^(254|0)/, '');

export default function tinypesa({ db, auth, credit, REFERRAL_RATE = 0.05 }) {
  const r = express.Router();
  db.exec(`CREATE TABLE IF NOT EXISTS payments(
    id INTEGER PRIMARY KEY, user_id INTEGER, phone TEXT, amount INTEGER, request_id TEXT,
    receipt TEXT UNIQUE, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);

  // 1. Browser asks us to start a deposit. We call TinyPesa; the customer gets the M-PESA PIN prompt.
  r.post('/deposit', auth, async (req, res) => {
    const kes = Math.round(Number(req.body.amount)), phone = norm(req.body.phone || '');
    if (!(kes >= 10 && kes <= 150000) || !/^0[17]\d{8}$/.test(phone))
      return res.status(400).json({ error: 'Enter a valid phone number and a whole amount of KES 10 or more.' });
    if (req.user.excl && req.user.excl > Date.now()) return res.status(403).json({ error: 'Your account is on a break.' });
    const id = db.prepare('INSERT INTO payments(user_id,phone,amount) VALUES(?,?,?)').run(req.user.id, phone, kes * 100).lastInsertRowid;
    try {
      const t = await fetch('https://tinypesa.com/api/v1/express/initialize', {
        method: 'POST',
        headers: { Apikey: process.env.TINYPESA_API_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ amount: String(kes), msisdn: phone, account_no: String(id) })
      });
      const d = await t.json().catch(() => ({}));
      if (!t.ok || d.success === false) throw new Error(d.message || 'TinyPesa rejected the request');
      db.prepare('UPDATE payments SET request_id=? WHERE id=?').run(String(d.request_id || ''), id);
      res.json({ id });
    } catch (e) {
      console.error('tinypesa initialize failed:', e.message);
      db.prepare("UPDATE payments SET status='failed' WHERE id=?").run(id);
      res.status(502).json({ error: 'Could not send the M-PESA prompt. Please try again.' });
    }
  });

  // 2. Browser polls this until the callback has arrived.
  r.get('/status/:id', auth, (req, res) => {
    const p = db.prepare('SELECT status FROM payments WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
    p ? res.json({ status: p.status }) : res.status(404).json({ error: 'Not found.' });
  });

  // 3. TinyPesa calls this when the customer pays or cancels. This is the ONLY place money is credited.
  r.post('/callback', express.json(), (req, res) => {
    if (req.query.s !== process.env.PAY_CALLBACK_SECRET) return res.sendStatus(403);
    console.log('tinypesa callback:', JSON.stringify(req.body).slice(0, 800));   // check these field names once, then you can remove this line
    const b = req.body || {}, cb = b.Body?.stkCallback || b;
    const meta = Object.fromEntries((cb.CallbackMetadata?.Item || []).map(i => [i.Name, i.Value]));
    const code = Number(cb.ResultCode ?? b.ResultCode ?? (b.success === true ? 0 : 1));
    const acc = String(b.account_no || b.AccountReference || cb.account_no || meta.AccountReference || '');
    const rid = String(cb.request_id || b.request_id || cb.CheckoutRequestID || '');
    const p = (acc && db.prepare('SELECT * FROM payments WHERE id=?').get(acc)) || (rid && db.prepare('SELECT * FROM payments WHERE request_id=?').get(rid));
    if (!p || p.status !== 'pending') return res.json({ ok: true });            // unknown or already handled
    if (code !== 0) { db.prepare("UPDATE payments SET status='failed' WHERE id=?").run(p.id); return res.json({ ok: true }); }
    const paid = Math.round(Number(meta.Amount ?? b.Amount ?? b.amount ?? p.amount / 100) * 100);
    const receipt = String(meta.MpesaReceiptNumber || b.receipt || b.MpesaReceiptNumber || '') || null;
    if (paid !== p.amount) { db.prepare("UPDATE payments SET status='review' WHERE id=?").run(p.id); return res.json({ ok: true }); } // amount mismatch: do not credit
    try {
      db.transaction(() => {
        const u = db.prepare("UPDATE payments SET status='success', receipt=? WHERE id=? AND status='pending'").run(receipt, p.id);
        if (!u.changes) return;
        credit(p.user_id, p.amount, 'deposit', 'M-PESA ' + (receipt || ''));
        const first = db.prepare("SELECT COUNT(*) c FROM tx WHERE user_id=? AND type='deposit'").get(p.user_id).c === 1;
        const ref = db.prepare('SELECT referred_by FROM users WHERE id=?').get(p.user_id)?.referred_by;
        if (first && ref) credit(ref, Math.floor(p.amount * REFERRAL_RATE), 'referral', 'Friend first deposit');
      })();
    } catch (e) { console.error('callback credit failed:', e.message); }       // e.g. duplicate receipt: safe to ignore
    res.json({ ok: true });
  });

  return r;
}
