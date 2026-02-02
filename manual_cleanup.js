const moment = require('moment');
const database = process.env.DATABASE_URL 
  ? require('./database/db-pg')
  : require('./database/db');

async function runCleanup() {
  try {
    await database.init();
    console.log('✅ Database initialized');

    const now = moment();
    const currentDate = now.format('YYYY-MM-DD');
    const currentTime = now.format('HH:mm');

    console.log(`\n🕐 Current date: ${currentDate}`);
    console.log(`🕐 Current time: ${currentTime}\n`);

    // Get all reservations before cleanup
    const beforeReservations = await database.getWeekReservations(
      moment().subtract(7, 'days').format('YYYY-MM-DD'),
      moment().add(7, 'days').format('YYYY-MM-DD')
    );
    
    console.log('📋 Reservations BEFORE cleanup:');
    beforeReservations.forEach(r => {
      console.log(`  - ${r.date} ${r.start_time}-${r.end_time} (${r.full_name}) [${r.reservation_code}]`);
    });

    // Delete old dates
    const result = await database.deleteOldReservations(currentDate);
    console.log(`\n🗑️  Deleted ${result.deleted || 0} reservations with dates before ${currentDate}`);
    
    // Delete past time slots today
    const todayOldSlots = await database.deletePastTimeSlotsToday(currentDate, currentTime);
    console.log(`🗑️  Deleted ${todayOldSlots || 0} reservations for today before ${currentTime}`);
    
    const totalDeleted = (result.deleted || 0) + (todayOldSlots || 0);
    console.log(`\n✅ Total deleted: ${totalDeleted} reservations\n`);

    // Get all reservations after cleanup
    const afterReservations = await database.getWeekReservations(
      moment().subtract(7, 'days').format('YYYY-MM-DD'),
      moment().add(7, 'days').format('YYYY-MM-DD')
    );
    
    console.log('📋 Reservations AFTER cleanup:');
    if (afterReservations.length === 0) {
      console.log('  (No reservations remaining)');
    } else {
      afterReservations.forEach(r => {
        console.log(`  - ${r.date} ${r.start_time}-${r.end_time} (${r.full_name}) [${r.reservation_code}]`);
      });
    }

    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

runCleanup();
