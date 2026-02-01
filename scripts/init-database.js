const database = require('../database/db');

async function initializeDatabase() {
  try {
    console.log('🔄 Duke inicializuar databazën...');
    await database.init();
    console.log('✅ Databaza u inicializua me sukses!');
    console.log('');
    console.log('ℹ️  Të dhënat e admin-it të paracaktuar:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('');
    console.log('⚠️  RËNDËSISHME: Ndryshoni fjalëkalimin e admin-it pas deployment-it!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Gabim gjatë inicializimit të databazës:', error);
    process.exit(1);
  }
}

initializeDatabase();