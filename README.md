# SkyBet (server folder)
Put ALL of these files inside the `server` folder of your GitHub repo (Render Root Directory = `server`).

Render settings
- Root Directory: server
- Build Command: npm install
- Start Command: npm start
- Environment: NODE_VERSION=22, JWT_SECRET, PAY_CALLBACK_SECRET, ADMIN_EMAIL, TINYPESA_API_KEY
- Only set DB_PATH=/var/data/skybet.db after you add a Disk mounted at /var/data (Starter plan or higher).
  Without a disk the database is wiped on every restart.

Check after deploy: open your onrender.com URL (the site) and /api/rounds (JSON).
