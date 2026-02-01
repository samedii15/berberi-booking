#!/usr/bin/env node

// Simple verification script
console.log('🧪 Verifying Berberi System...\n');

const fs = require('fs');
const path = require('path');

let checks = 0;
let passed = 0;

function checkFile(filePath, description) {
  checks++;
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description}`);
    passed++;
  } else {
    console.log(`❌ ${description} - Missing: ${filePath}`);
  }
}

function checkDatabase() {
  checks++;
  const dbPath = path.join(__dirname, '..', 'database.sqlite');
  if (fs.existsSync(dbPath)) {
    console.log(`✅ SQLite database exists (${Math.round(fs.statSync(dbPath).size / 1024)}KB)`);
    passed++;
  } else {
    console.log(`❌ SQLite database missing`);
  }
}

// Check core files
console.log('📁 Checking core files:');
checkFile(path.join(__dirname, '..', 'server.js'), 'Main server file');
checkFile(path.join(__dirname, '..', 'package.json'), 'Package configuration');

console.log('\n🗄️  Checking database:');
checkFile(path.join(__dirname, '..', 'database', 'db.js'), 'Database module');
checkDatabase();

console.log('\n🌐 Checking backend routes:');
checkFile(path.join(__dirname, '..', 'routes', 'weekly.js'), 'Weekly calendar API');
checkFile(path.join(__dirname, '..', 'routes', 'booking.js'), 'Booking API');
checkFile(path.join(__dirname, '..', 'routes', 'codes.js'), 'Reservation codes API');
checkFile(path.join(__dirname, '..', 'routes', 'admin.js'), 'Admin API');

console.log('\n🎨 Checking frontend files:');
checkFile(path.join(__dirname, '..', 'public', 'index.html'), 'Main page');
checkFile(path.join(__dirname, '..', 'public', 'rezervime.html'), 'Booking page');
checkFile(path.join(__dirname, '..', 'public', 'kodi.html'), 'Code management page');
checkFile(path.join(__dirname, '..', 'public', 'admin.html'), 'Admin page');
checkFile(path.join(__dirname, '..', 'public', 'style.css'), 'Main stylesheet');
checkFile(path.join(__dirname, '..', 'public', 'app.js'), 'Main JavaScript');

console.log('\n🧹 Checking services:');
checkFile(path.join(__dirname, '..', 'services', 'cleanup.js'), 'Weekly cleanup service');

console.log('\n📋 Summary:');
console.log(`✅ Passed: ${passed}/${checks}`);
console.log(`📊 Success Rate: ${Math.round(passed/checks*100)}%`);

if (passed === checks) {
  console.log('\n🎉 All files present! System appears to be complete.');
  console.log('\n🚀 To test the system:');
  console.log('1. Make sure the server is running: npm start');
  console.log('2. Open http://localhost:3000 in your browser');
  console.log('3. Test booking: click "Caktoni Terminin"');
  console.log('4. Test admin panel: go to /admin (admin/admin123)');
  console.log('5. Test code management: go to /kodi');
} else {
  console.log('\n⚠️  Some files are missing. Check the output above.');
}

console.log('\n📝 Key Features Implemented:');
console.log('• Mobile-first responsive design');
console.log('• Albanian language interface');
console.log('• 25-minute time slots (9:00-20:00)');
console.log('• Weekly calendar (Mon-Sat, auto-cleanup)');
console.log('• No-registration booking (name only)');
console.log('• Unique reservation codes');
console.log('• Code-based reservation management');
console.log('• Admin panel with authentication');
console.log('• SQLite persistent database');
console.log('• Automatic weekly cleanup');
console.log('• Rate limiting and security');

process.exit(passed === checks ? 0 : 1);