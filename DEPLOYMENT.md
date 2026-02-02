# Udhëzime Deployment - Berberi

## 🚀 Deploy në Heroku

### 1. Përgatitja
```bash
# Klono projektin
git clone <your-repo-url>
cd TeBerberi

# Instalo Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login në Heroku
heroku login
```

### 2. Krijo aplikacionin
```bash
# Krijo aplikacion të ri
heroku create berberi-app

# Shto environment variables
heroku config:set NODE_ENV=production
heroku config:set PORT=3000
```

### 3. Deploy
```bash
# Shto files në Git
git add .
git commit -m "Initial deployment"

# Push në Heroku
git push heroku main

# Inicializo databazën
heroku run npm run initdb
```

### 4. Hap aplikacionin
```bash
heroku open
```

---

## 🌐 Deploy në VPS/Server

### 1. Përgatitja e serverit
```bash
# Update sistemin
sudo apt update && sudo apt upgrade -y

# Instalo Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalo PM2 për process management
sudo npm install -g pm2
```

### 2. Upload dhe setup
```bash
# Upload files në server (via SCP, rsync, ose Git)
git clone <your-repo-url> berberi
cd berberi

# Instalo dependencies
npm install --production

# Inicializo databazën
npm run initdb
```

### 3. Start me PM2
```bash
# Krijo PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'berberi',
    script: 'server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Start aplikacionin
pm2 start ecosystem.config.js

# Ruaj PM2 konfigurimin
pm2 save
pm2 startup
```

### 4. Setup Nginx (opsionale)
```bash
# Instalo Nginx
sudo apt install nginx

# Krijo konfigurimin
sudo cat > /etc/nginx/sites-available/berberi << EOF
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Aktivizo site-in
sudo ln -s /etc/nginx/sites-available/berberi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📱 Deploy në Vercel

### 1. Përgatitja
```bash
# Instalo Vercel CLI
npm i -g vercel

# Login
vercel login
```

### 2. Konfiguro vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 3. Deploy
```bash
vercel --prod
```

**Shënim:** Vercel ka limitime për SQLite në production. Për Vercel, rekomandohet përdorimi i një databaze të jashtme si PlanetScale ose Supabase.

---

## 🔒 Siguria në Production

### 1. Ndrysho fjalëkalimet e admin
```bash
# Hyr në databazë dhe ndrysho fjalëkalimin
sqlite3 database.sqlite

# Gjenero hash të ri për fjalëkalimin
node -e "
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('YOUR_NEW_PASSWORD', 10);
console.log('New hash:', hash);
"

# Update në databazë
UPDATE admin_users SET password_hash = 'NEW_HASH_HERE' WHERE username = 'admin';
.quit
```

### 2. Environment Variables
```bash
# Shto në .env file (mos e commit në Git!)
NODE_ENV=production
PORT=3000
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key
RATE_LIMIT_REQUESTS=5
```

### 3. HTTPS dhe SSL
- Përdor SSL certificate (Let's Encrypt ose Cloudflare)
- Konfiguro HTTPS redirects
- Shto security headers

### 4. Backup-et
```bash
# Backup automatic i databazës
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
cp database.sqlite "backups/database_backup_$DATE.sqlite"

# Mbaj vetëm 30 backup-e më të fundit
ls -t backups/database_backup_*.sqlite | tail -n +31 | xargs rm -f

# Shto në cron për backup të përditshëm
# crontab -e
# 0 2 * * * /path/to/backup.sh
```

---

## 📊 Monitorimi

### 1. Logs
```bash
# PM2 logs
pm2 logs berberi

# Server logs
tail -f /var/log/nginx/access.log
```

### 2. Performance
```bash
# PM2 monitoring
pm2 monit

# System resources
htop
```

### 3. Database maintenance
```bash
# Cleanup të vjetra manualisht
sqlite3 database.sqlite "DELETE FROM reservations WHERE date < date('now', '-7 days');"

# Optimize database
sqlite3 database.sqlite "VACUUM;"
```

---

## 🆘 Troubleshooting

### Database permissions
```bash
chmod 664 database.sqlite
chown www-data:www-data database.sqlite
```

### Node.js version issues
```bash
# Check version
node --version

# Update Node.js
sudo npm cache clean -f
sudo npm install -g n
sudo n stable
```

### Memory issues
```bash
# Check memory usage
free -h

# Restart aplikacionin
pm2 restart berberi
```

---

## ✅ Checklist pas Deployment

- [ ] Aplikacioni hapet në browser
- [ ] Rezervimi funksionon
- [ ] Kodi i rezervimit funksionon
- [ ] Admin panel hapet (set ADMIN_PASSWORD env var)
- [ ] Database krijon rezervime
- [ ] Cleanup automatik po funksionon
- [ ] SSL/HTTPS aktivizuar
- [ ] Backup automatik konfiguruar
- [ ] Monitoring setup
- [ ] Admin password ndryshuar
- [ ] Performance optimizuar
- [ ] Mobile responsiveness verified

**🎉 Sistema juaj e rezervimit është gati për përdorim!**