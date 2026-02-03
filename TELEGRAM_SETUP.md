# 📱 UDHËZUES: SI TË AKTIVIZOSH NJOFTIMET NË TELEGRAM

## Hapi 1: Krijo Telegram Bot (2 minuta)

1. **Hap Telegram** në telefonin tënd
2. **Kërko: @BotFather** (ky është bot zyrtari i Telegram)
3. **Dërgo komandën**: `/newbot`
4. **BotFather do të të pyesë për emër**: 
   - Shkruaj: `Berberi Rezervime Bot`
5. **Më pas do të të pyesë për username** (duhet të përfundojë me `bot`):
   - Shkruaj: `TeBerberi_Bot` (ose diçka tjetër që të pëlqen)
6. **BotFather do të të japë një TOKEN** që duket kështu:
   ```
   123456789:ABCdefGHIjklMNOpqrSTUvwxYZ1234567890
   ```
   ⚠️ **RUAJE KËTË TOKEN - do të na duhet!**

## Hapi 2: Gjej CHAT ID tëndin

1. **Kërko bot-in që sapo krijove** (p.sh. @TeBerberi_Bot)
2. **Klik "Start"** ose dërgo çfarëdo mesazhi
3. **Hap këtë link në browser** (zëvendëso TOKEN-in me atë tëndin):
   ```
   https://api.telegram.org/botYOUR_TOKEN_HERE/getUpdates
   ```
   Shembull:
   ```
   https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrSTUvwxYZ1234567890/getUpdates
   ```
4. **Gjej numrin "chat": {"id": 123456789}**
   - Ky është CHAT ID yt (do të jetë një numër si: 123456789 ose -987654321)

## Hapi 3: Vendos TOKEN dhe CHAT ID në sistem

### Opsioni 1: Përmes Environment Variables (Rekomanduar)

1. Krijo një file `.env` në follder-in e projektit:
   ```
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ1234567890
   TELEGRAM_CHAT_ID=123456789
   ```

### Opsioni 2: Direkt në kod

1. Hap file-in: `services/telegram.js`
2. Gjej këto rreshta:
   ```javascript
   this.botToken = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
   this.chatId = process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID_HERE';
   ```
3. Zëvendëso me të dhënat e tua:
   ```javascript
   this.botToken = process.env.TELEGRAM_BOT_TOKEN || '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ1234567890';
   this.chatId = process.env.TELEGRAM_CHAT_ID || '123456789';
   ```

## Hapi 4: Testo Njoftimet

1. **Restart serverin**:
   ```
   npm start
   ```

2. **Bëj një rezervim test** nga faqja

3. **Kontrollo telefonin** - duhet të të vijë një mesazh si ky:
   ```
   🆕 Rezervim i Ri!

   👤 Emri: Test User
   📅 Data: 03 Shkurt 2026
   🕐 Ora: 09:00 - 09:30
   🔑 Kodi: ABC123

   ✂️ Berberi - Sistem Rezervimi
   ```

## ✅ ÇFARË DO TË MARRËSH SI NJOFTIM:

### Rezervim i ri:
```
🆕 Rezervim i Ri!
👤 Emri: Samed Surkishi
📅 Data: 03 Shkurt 2026
🕐 Ora: 14:30 - 14:55
🔑 Kodi: XYZ789
```

### Anulim:
```
❌ Rezervim i Anuluar
👤 Emri: Samed Surkishi
📅 Data: 03 Shkurt 2026
🕐 Ora: 14:30 - 14:55
🔑 Kodi: XYZ789
```

### Ndryshim:
```
✏️ Rezervim i Ndryshuar
👤 Emri: Samed Surkishi

NGA:
📅 03 Shkurt 2026
🕐 14:30 - 14:55

NË:
📅 04 Shkurt 2026
🕐 10:00 - 10:30

🔑 Kodi: XYZ789
```

## 🆘 Nëse Nuk Funksionon:

1. Sigurohu që TOKEN dhe CHAT ID janë të sakta
2. Sigurohu që ke dërguar të paktën një mesazh te bot-i
3. Kontrollo console-në e serverit për gabime
4. Provo të dërgosh një test notification duke shtuar këtë në `server.js`:
   ```javascript
   const telegram = require('./services/telegram');
   telegram.sendTestNotification();
   ```

## 📞 A mund të marr njoftime në shumë telefona?

Po! Mund të:
1. Kriosh një grup në Telegram
2. Shtosh bot-in në grup
3. Përdor CHAT ID e grupit (do të jetë një numër negativ si: -987654321)

Kështu të gjithë në grup do të marrin njoftimet!

---

💡 **TIP**: Nëse nuk dëshiron njoftime për çdo ndryshim, mund të komentosh ato në kod.
