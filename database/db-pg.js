const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

class DatabasePG {
  constructor() {
    this.pool = null;
  }

  init() {
    return new Promise(async (resolve, reject) => {
      try {
        // Use DATABASE_URL from Render or local PostgreSQL
        this.pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
        });

        console.log('✅ PostgreSQL database connected');
        await this.createTables();
        resolve();
      } catch (err) {
        console.error('❌ Database connection error:', err.message);
        reject(err);
      }
    });
  }

  async createTables() {
    const createReservationsTable = `
      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        reservation_code TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, start_time)
      )
    `;

    const createAdminUsersTable = `
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await this.pool.query(createReservationsTable);
    await this.pool.query(createAdminUsersTable);
    console.log('✅ Tables created successfully');
    
    await this.createDefaultAdmin();
  }

  async createDefaultAdmin() {
    const username = 'admin';
    const password = 'admin123';

    const result = await this.pool.query(
      'SELECT id FROM admin_users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      const hash = await bcrypt.hash(password, 10);
      await this.pool.query(
        'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)',
        [username, hash]
      );
      console.log('👨‍💼 Default admin created: admin/admin123');
    }
  }

  // Reservations
  async createReservation(fullName, date, startTime, endTime, code) {
    const result = await this.pool.query(
      'INSERT INTO reservations (full_name, date, start_time, end_time, reservation_code) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [fullName, date, startTime, endTime, code]
    );
    return { id: result.rows[0].id, reservation_code: code };
  }

  async getReservationByCode(code) {
    const result = await this.pool.query(
      'SELECT * FROM reservations WHERE reservation_code = $1 AND status = $2',
      [code, 'active']
    );
    return result.rows[0];
  }

  async getWeekReservations(startDate, endDate) {
    const result = await this.pool.query(
      'SELECT * FROM reservations WHERE date BETWEEN $1 AND $2 AND status = $3 ORDER BY date, start_time',
      [startDate, endDate, 'active']
    );
    return result.rows;
  }

  async updateReservation(code, newDate, newStartTime, newEndTime) {
    const result = await this.pool.query(
      'UPDATE reservations SET date = $1, start_time = $2, end_time = $3 WHERE reservation_code = $4 AND status = $5',
      [newDate, newStartTime, newEndTime, code, 'active']
    );
    return { changes: result.rowCount };
  }

  async cancelReservation(code) {
    const result = await this.pool.query(
      'DELETE FROM reservations WHERE reservation_code = $1 AND status = $2',
      [code, 'active']
    );
    return { changes: result.rowCount };
  }

  async deleteOldReservations(beforeDate) {
    const result = await this.pool.query(
      'DELETE FROM reservations WHERE date < $1',
      [beforeDate]
    );
    return { deleted: result.rowCount };
  }

  async deletePastTimeSlotsToday(currentDate, currentTime) {
    const result = await this.pool.query(
      'DELETE FROM reservations WHERE date = $1 AND start_time < $2',
      [currentDate, currentTime]
    );
    return result.rowCount;
  }

  async getAdminByUsername(username) {
    const result = await this.pool.query(
      'SELECT * FROM admin_users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('Database connection closed');
    }
  }
}

module.exports = new DatabasePG();
