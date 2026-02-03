const usePostgres = Boolean(process.env.DATABASE_URL);

if (usePostgres) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  pool.query('DELETE FROM reservations WHERE status = $1', ['cancelled'])
    .then(result => {
      console.log('Deleted ' + result.rowCount + ' cancelled reservations');
    })
    .catch(err => {
      console.error('Error:', err);
    })
    .finally(() => pool.end());
} else {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database('./database.sqlite');

  db.run('DELETE FROM reservations WHERE status = ?', ['cancelled'], function(err) {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('Deleted ' + this.changes + ' cancelled reservations');
    }
    db.close();
  });
}
