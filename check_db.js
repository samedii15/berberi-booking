const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all('SELECT * FROM reservations WHERE date = ? ORDER BY start_time', ['2026-01-26'], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Monday reservations:');
    console.log(JSON.stringify(rows, null, 2));
  }
  db.close();
});
