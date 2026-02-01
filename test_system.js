const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('=== SYSTEM CHECK ===\n');

// 1. Check all reservations
db.all('SELECT * FROM reservations ORDER BY date, start_time', [], (err, rows) => {
  if (err) {
    console.error('Error fetching reservations:', err);
  } else {
    console.log(`Total reservations: ${rows.length}`);
    console.log('\nActive reservations:');
    rows.filter(r => r.status === 'active').forEach(r => {
      console.log(`  - ${r.date} ${r.start_time} | ${r.full_name} | Code: ${r.reservation_code}`);
    });
    
    const cancelled = rows.filter(r => r.status === 'cancelled');
    if (cancelled.length > 0) {
      console.log(`\n⚠️  WARNING: Found ${cancelled.length} cancelled reservations still in database!`);
      cancelled.forEach(r => {
        console.log(`  - ${r.date} ${r.start_time} | ${r.full_name} | Code: ${r.reservation_code}`);
      });
    }
    
    // Check for duplicate slots
    console.log('\nChecking for duplicate slots...');
    const slotMap = {};
    let duplicates = false;
    rows.forEach(r => {
      const key = `${r.date}_${r.start_time}`;
      if (slotMap[key]) {
        console.log(`  ❌ DUPLICATE FOUND: ${r.date} ${r.start_time}`);
        console.log(`     First: ${slotMap[key].full_name} (${slotMap[key].status})`);
        console.log(`     Second: ${r.full_name} (${r.status})`);
        duplicates = true;
      }
      slotMap[key] = r;
    });
    
    if (!duplicates) {
      console.log('  ✅ No duplicates found');
    }
  }
  
  // 2. Check admin users
  db.all('SELECT username, created_at FROM admin_users', [], (err, users) => {
    if (err) {
      console.error('Error fetching admin users:', err);
    } else {
      console.log(`\nAdmin users: ${users.length}`);
      users.forEach(u => {
        console.log(`  - ${u.username}`);
      });
    }
    
    // 3. Check table structure
    db.all("SELECT sql FROM sqlite_master WHERE type='table'", [], (err, tables) => {
      if (err) {
        console.error('Error fetching tables:', err);
      } else {
        console.log('\nDatabase tables:');
        tables.forEach(t => {
          console.log(`\n${t.sql}`);
        });
      }
      
      console.log('\n=== CHECK COMPLETE ===');
      db.close();
    });
  });
});
