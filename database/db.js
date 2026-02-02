const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

class Database {
  constructor() {
    this.db = null;
  }

  init() {
    return new Promise((resolve, reject) => {
      // Use current directory for local, /tmp for cloud (writable on Render)
      const dbPath = process.env.RENDER ? '/tmp/database.sqlite' : path.join(__dirname, '..', 'database.sqlite');
      
      console.log('📂 Database path:', dbPath);
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Gabim gjatë lidhjes me databazën:', err.message);
          reject(err);
        } else {
          console.log('✅ Databaza e lidhur me sukses');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  createTables() {
    return new Promise((resolve, reject) => {
      const createReservationsTable = `
        CREATE TABLE IF NOT EXISTS reservations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          full_name TEXT NOT NULL,
          date TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          reservation_code TEXT UNIQUE NOT NULL,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(date, start_time)
        )
      `;

      const createAdminUsersTable = `
        CREATE TABLE IF NOT EXISTS admin_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createRestDaysTable = `
        CREATE TABLE IF NOT EXISTS rest_days (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.serialize(() => {
        this.db.run(createReservationsTable, (err) => {
          if (err) {
            console.error('Gabim gjatë krijimit të tabelës reservations:', err.message);
            reject(err);
          }
        });

        this.db.run(createAdminUsersTable, (err) => {
          if (err) {
            console.error('Gabim gjatë krijimit të tabelës admin_users:', err.message);
            reject(err);
          }
        });

        this.db.run(createRestDaysTable, (err) => {
          if (err) {
            console.error('Gabim gjatë krijimit të tabelës rest_days:', err.message);
            reject(err);
          }
        });

        // Krijo admin të paracaktuar nëse nuk ekziston
        this.createDefaultAdmin().then(() => {
          console.log('✅ Tabelat e databazës u krijuan me sukses');
          resolve();
        }).catch(reject);
      });
    });
  }

  async createDefaultAdmin() {
    return new Promise((resolve, reject) => {
      const username = 'admin';
      const password = 'admin123'; // NDRYSHO KËTË në production!

      this.db.get('SELECT id FROM admin_users WHERE username = ?', [username], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          // Krijo admin të ri
          bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
              reject(err);
              return;
            }

            this.db.run(
              'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
              [username, hash],
              function(err) {
                if (err) {
                  reject(err);
                } else {
                  console.log('👨‍💼 Admin i paracaktuar u krijua: admin/admin123');
                  resolve();
                }
              }
            );
          });
        } else {
          resolve();
        }
      });
    });
  }

  // Rezervime CRUD
  async createReservation(fullName, date, startTime, endTime, code) {
    // Re-initialize if db is null
    if (!this.db) {
      console.log('⚠️  Database connection lost, re-initializing...');
      await this.init();
    }
    
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO reservations (full_name, date, start_time, end_time, reservation_code)
        VALUES (?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [fullName, date, startTime, endTime, code], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, reservation_code: code });
        }
      });
    });
  }

  async getReservationByCode(code) {
    // Re-initialize if db is null
    if (!this.db) {
      console.log('⚠️  Database connection lost, re-initializing...');
      await this.init();
    }
    
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM reservations 
        WHERE reservation_code = ? AND status = 'active'
      `;

      this.db.get(sql, [code], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async getWeekReservations(startDate, endDate) {
    // Re-initialize if db is null
    if (!this.db) {
      console.log('⚠️  Database connection lost, re-initializing...');
      await this.init();
    }
    
    return new Promise((resolve, reject) => {
      const moment = require('moment-timezone');
      const now = moment();
      const currentDate = now.format('YYYY-MM-DD');
      const currentTime = now.format('HH:mm');
      
      const sql = `
        SELECT * FROM reservations 
        WHERE date BETWEEN ? AND ? 
        AND status = 'active'
        AND (
          date > ? 
          OR (date = ? AND end_time > ?)
        )
        ORDER BY date, start_time
      `;

      this.db.all(sql, [startDate, endDate, currentDate, currentDate, currentTime], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  updateReservation(code, newDate, newStartTime, newEndTime) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE reservations 
        SET date = ?, start_time = ?, end_time = ?
        WHERE reservation_code = ? AND status = 'active'
      `;

      this.db.run(sql, [newDate, newStartTime, newEndTime, code], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  cancelReservation(code) {
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM reservations 
        WHERE reservation_code = ? AND status = 'active'
      `;

      this.db.run(sql, [code], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Pastrimi javor
  async deleteOldReservations(beforeDate) {
    // Re-initialize if db is null (Render /tmp cleanup issue)
    if (!this.db) {
      console.log('⚠️  Database connection lost, re-initializing...');
      await this.init();
    }
    
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM reservations WHERE date < ?';

      this.db.run(sql, [beforeDate], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ deleted: this.changes });
        }
      });
    });
  }

  // Fshi rezervimet e sotit që kanë përfunduar (end_time ka kaluar)
  async deletePastTimeSlotsToday(currentDate, currentTime) {
    // Re-initialize if db is null (Render /tmp cleanup issue)
    if (!this.db) {
      console.log('⚠️  Database connection lost, re-initializing...');
      await this.init();
    }
    
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM reservations 
        WHERE date = ? AND end_time <= ?
      `;

      this.db.run(sql, [currentDate, currentTime], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  // Admin
  getAdminByUsername(username) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM admin_users WHERE username = ?';

      this.db.get(sql, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Rest days management
  markDayAsRest(date) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR IGNORE INTO rest_days (date) VALUES (?)',
        [date],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  }

  unmarkRestDay(date) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM rest_days WHERE date = ?',
        [date],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  isRestDay(date) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM rest_days WHERE date = ?',
        [date],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  }

  getRestDays(startDate, endDate) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT date FROM rest_days WHERE date BETWEEN ? AND ?',
        [startDate, endDate],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(r => r.date));
        }
      );
    });
  }

  deleteReservationsForDate(date) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM reservations WHERE date = ?',
        [date],
        function(err) {
          if (err) reject(err);
          else resolve({ deleted: this.changes });
        }
      );
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Gabim gjatë mbylljes së databazës:', err.message);
        } else {
          console.log('Databaza u mbyll me sukses');
        }
      });
    }
  }
}

module.exports = new Database();