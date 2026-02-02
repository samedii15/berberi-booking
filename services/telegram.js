const https = require('https');

class TelegramNotification {
  constructor() {
    // Get credentials from environment variables only
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '';
    this.enabled = this.botToken && this.chatId && 
                   this.botToken !== 'YOUR_BOT_TOKEN_HERE' && 
                   this.chatId !== 'YOUR_CHAT_ID_HERE';
  }

  sendMessage(message) {
    if (!this.enabled) {
      console.log('⚠️  Telegram notifications disabled. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML'
      });

      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${this.botToken}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✅ Telegram notification sent');
            resolve(responseData);
          } else {
            console.error('❌ Telegram notification failed:', res.statusCode, responseData);
            reject(new Error(`Telegram API error: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ Telegram request error:', error);
        reject(error);
      });

      req.write(data);
      req.end();
    });
  }

  // Njoftim për rezervim të ri
  async notifyNewReservation(reservation) {
    const message = `
🆕 <b>Rezervim i Ri!</b>

👤 <b>Emri:</b> ${reservation.full_name}
📅 <b>Data:</b> ${reservation.date}
🕐 <b>Ora:</b> ${reservation.start_time} - ${reservation.end_time}
🔑 <b>Kodi:</b> <code>${reservation.code}</code>

✂️ <i>Berberi - Sistem Rezervimi</i>
    `.trim();

    try {
      await this.sendMessage(message);
    } catch (error) {
      // Don't throw error to avoid blocking reservation
      console.error('Failed to send Telegram notification:', error);
    }
  }

  // Njoftim për anulim
  async notifyReservationCancelled(reservation) {
    const message = `
❌ <b>Rezervim i Anuluar</b>

👤 <b>Emri:</b> ${reservation.full_name}
📅 <b>Data:</b> ${reservation.date}
🕐 <b>Ora:</b> ${reservation.start_time} - ${reservation.end_time}
🔑 <b>Kodi:</b> <code>${reservation.code}</code>

✂️ <i>Berberi - Sistem Rezervimi</i>
    `.trim();

    try {
      await this.sendMessage(message);
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
    }
  }

  // Njoftim për ndryshim
  async notifyReservationChanged(oldReservation, newReservation) {
    const message = `
✏️ <b>Rezervim i Ndryshuar</b>

👤 <b>Emri:</b> ${oldReservation.full_name}

<b>NGA:</b>
📅 ${oldReservation.date}
🕐 ${oldReservation.start_time} - ${oldReservation.end_time}

<b>NË:</b>
📅 ${newReservation.date}
🕐 ${newReservation.start_time} - ${newReservation.end_time}

🔑 <b>Kodi:</b> <code>${oldReservation.code}</code>

✂️ <i>Berberi - Sistem Rezervimi</i>
    `.trim();

    try {
      await this.sendMessage(message);
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
    }
  }

  // Test notification
  async sendTestNotification() {
    const message = `
✅ <b>Test Notification</b>

Telegram notifications janë të aktivizuara!
Tani do të merrni njoftime për:
• Rezervime të reja
• Anulimet
• Ndryshimet

✂️ <i>Berberi - Sistem Rezervimi</i>
    `.trim();

    return this.sendMessage(message);
  }
}

module.exports = new TelegramNotification();
