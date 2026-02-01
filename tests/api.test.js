// Simple API test script for Berberi booking system
// This is a basic manual test that can be run to verify the API endpoints

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function logTest(name, passed, message) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${name}: ${message || ''}`);
    results.tests.push({ name, passed, message });
    if (passed) results.passed++;
    else results.failed++;
  }

  console.log('🧪 Testing Berberi API...\n');

  try {
    // Test 1: Get weekly calendar
    console.log('📅 Testing weekly calendar...');
    const weeklyResponse = await fetch(`${BASE_URL}/api/java`);
    const weeklyData = await weeklyResponse.json();
    
    logTest('GET /api/java', weeklyResponse.ok && weeklyData.success, 
      weeklyData.success ? `Found ${weeklyData.meta.totalSlots} total slots` : weeklyData.error);

    // Test 2: Make a reservation
    if (weeklyData.success && weeklyData.week.days.length > 0) {
      console.log('\n📝 Testing reservation...');
      const firstDay = weeklyData.week.days[0];
      const availableSlot = firstDay.slots.find(slot => slot.isAvailable);
      
      if (availableSlot) {
        const reservationData = {
          full_name: 'Test User',
          date: firstDay.date,
          start_time: availableSlot.startTime
        };

        const reservationResponse = await fetch(`${BASE_URL}/api/rezervo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reservationData)
        });
        
        const reservationResult = await reservationResponse.json();
        
        logTest('POST /api/rezervo', reservationResponse.ok && reservationResult.success,
          reservationResult.success ? `Created reservation with code ${reservationResult.reservation.code}` : reservationResult.error);

        // Test 3: Find reservation by code
        if (reservationResult.success) {
          console.log('\n🔍 Testing code lookup...');
          const code = reservationResult.reservation.code;
          
          const codeResponse = await fetch(`${BASE_URL}/api/kodi/gjej`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
          });
          
          const codeResult = await codeResponse.json();
          
          logTest('POST /api/kodi/gjej', codeResponse.ok && codeResult.success,
            codeResult.success ? `Found reservation for ${codeResult.reservation.name}` : codeResult.error);

          // Test 4: Cancel reservation
          console.log('\n❌ Testing cancellation...');
          const cancelResponse = await fetch(`${BASE_URL}/api/kodi/anulo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
          });
          
          const cancelResult = await cancelResponse.json();
          
          logTest('POST /api/kodi/anulo', cancelResponse.ok && cancelResult.success,
            cancelResult.success ? 'Reservation cancelled successfully' : cancelResult.error);
        }
      } else {
        logTest('Find available slot', false, 'No available slots found for testing');
      }
    }

    // Test 5: Admin login
    console.log('\n👨‍💼 Testing admin login...');
    const adminResponse = await fetch(`${BASE_URL}/api/admin/hyrje`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const adminResult = await adminResponse.json();
    
    logTest('POST /api/admin/hyrje', adminResponse.ok && adminResult.success,
      adminResult.success ? `Logged in as ${adminResult.admin.username}` : adminResult.error);

    // Test 6: Get admin reservations
    if (adminResult.success) {
      console.log('\n📊 Testing admin reservations...');
      const adminReservationsResponse = await fetch(`${BASE_URL}/api/admin/rezervimet`);
      const adminReservationsResult = await adminReservationsResponse.json();
      
      logTest('GET /api/admin/rezervimet', adminReservationsResponse.ok && adminReservationsResult.success,
        adminReservationsResult.success ? `Found ${adminReservationsResult.statistics.totalReservations} reservations` : adminReservationsResult.error);
    }

    // Summary
    console.log('\n📋 Test Summary:');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total: ${results.tests.length}`);
    
    if (results.failed === 0) {
      console.log('\n🎉 All tests passed! The barbershop booking system is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the output above for details.');
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testAPI();
}

module.exports = { testAPI };