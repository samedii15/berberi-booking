// Script to manually create admin user
const database = process.env.DATABASE_URL 
  ? require('./database/db-pg')
  : require('./database/db');

async function createAdmin() {
  try {
    await database.init();
    console.log('✅ Database initialized');
    
    const admin = await database.getAdminByUsername('admin');
    
    if (admin) {
      console.log('✅ Admin user already exists!');
      console.log('   Username: admin');
      console.log('   Password: admin123');
    } else {
      console.log('❌ Admin user not found!');
      console.log('Creating admin user...');
      await database.createDefaultAdmin();
      console.log('✅ Admin user created!');
      console.log('   Username: admin');
      console.log('   Password: admin123');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
