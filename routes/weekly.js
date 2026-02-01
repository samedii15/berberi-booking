const express = require('express');
const router = express.Router();
const cleanupService = require('../services/cleanup');
const database = process.env.DATABASE_URL 
  ? require('../database/db-pg')
  : require('../database/db');

// GET /api/java - Kthen javën aktuale me slot-e dhe rezervime
router.get('/java', async (req, res) => {
  try {
    const weekData = cleanupService.getCurrentWeekDates();
    const reservations = await database.getWeekReservations(weekData.startDate, weekData.endDate);

    // Gjenero slot-et për çdo ditë
    const daysWithSlots = weekData.days.map(day => {
      const slots = cleanupService.generateDaySlots(day.date);
      
      // Shëno slot-et e rezervuara
      slots.forEach(slot => {
        const reservation = reservations.find(r => 
          r.date === day.date && r.start_time === slot.startTime
        );
        
        if (reservation) {
          slot.isAvailable = false;
          slot.reserved = {
            id: reservation.id,
            name: reservation.full_name,
            code: reservation.reservation_code
          };
        }
      });

      return {
        ...day,
        slots: slots
      };
    });

    res.json({
      success: true,
      week: {
        ...weekData,
        days: daysWithSlots
      },
      meta: {
        totalSlots: daysWithSlots.reduce((sum, day) => sum + day.slots.length, 0),
        availableSlots: daysWithSlots.reduce((sum, day) => 
          sum + day.slots.filter(slot => slot.isAvailable).length, 0
        ),
        reservedSlots: reservations.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Gabim në /api/java:', error);
    res.status(500).json({
      success: false,
      error: 'Ka ndodhur një gabim gjatë ngarkimit të kalendarit.'
    });
  }
});

module.exports = router;