const database = require('../database/db');

async function initializeDatabase() {
  try {
    console.log('🔄 Duke inicializuar databazën...');
    await database.init();
    console.log('✅ Databaza u inicializua me sukses!');
    console.log('');
    console.log('ℹ️  Admin user configuration:');
    console.log('   Username: admin');
    console.log('   Password: Set via ADMIN_PASSWORD environment variable');
    console.log('');
    console.log('⚠️  IMPORTANT: Set a strong ADMIN_PASSWORD in production!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Gabim gjatë inicializimit të databazës:', error);
    process.exit(1);
  }
}

initializeDatabase();