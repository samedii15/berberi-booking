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
