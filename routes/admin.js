const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const database = require('../database/db');
const cleanupService = require('../services/cleanup');

// POST /api/admin/hyrje - Admin login
router.post('/hyrje', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Emri i përdoruesit dhe fjalëkalimi janë të detyrueshëm.'
      });
    }

    const admin = await database.getAdminByUsername(username.trim());
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Emri i përdoruesit ose fjalëkalimi është i gabuar.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Emri i përdoruesit ose fjalëkalimi është i gabuar.'
      });
    }

    // Në një aplikacion real, këtu do të gjeneronit JWT token
    // Për këtë projekt të thjeshtë, thjesht konfirmojmë login
    req.session = { adminId: admin.id, username: admin.username };

    res.json({
      success: true,
      message: 'U hyrt me sukses si administrator.',
      admin: {
        id: admin.id,
        username: admin.username
      }
    });

  } catch (error) {
    console.error('Gabim në /api/admin/hyrje:', error);
    res.status(500).json({
      success: false,
      error: 'Ka ndodhur një gabim gjatë hyrjes.'
    });
  }
});

// GET /api/admin/rezervimet - Lista e të gjitha rezervimeve të javës aktuale
router.get('/rezervimet', async (req, res) => {
  try {
    const weekData = cleanupService.getCurrentWeekDates();
    const reservations = await database.getWeekReservations(weekData.startDate, weekData.endDate);

    // Gruppo rezervimet sipas ditës
    const reservationsByDay = {};
    weekData.days.forEach(day => {
      reservationsByDay[day.date] = {
        dayInfo: day,
        reservations: []
      };
    });

    reservations.forEach(reservation => {
      if (reservationsByDay[reservation.date]) {
        reservationsByDay[reservation.date].reservations.push({
          id: reservation.id,
          name: reservation.full_name,
          code: reservation.reservation_code,
          startTime: reservation.start_time,
          endTime: reservation.end_time,
          display: `${reservation.start_time} - ${reservation.end_time}`,
          status: reservation.status,
          createdAt: reservation.created_at
        });
      }
    });

    // Sorto rezervimet brenda çdo dite sipas orës
    Object.keys(reservationsByDay).forEach(date => {
      reservationsByDay[date].reservations.sort((a, b) => 
        a.startTime.localeCompare(b.startTime)
      );
    });

    res.json({
      success: true,
      week: weekData,
      reservationsByDay: reservationsByDay,
      statistics: {
        totalReservations: reservations.length,
        activeReservations: reservations.filter(r => r.status === 'active').length,
        cancelledReservations: reservations.filter(r => r.status === 'cancelled').length,
        totalSlots: weekData.days.length * 29, // 6 ditë × 29 slot-e për ditë
        occupancyRate: Math.round((reservations.filter(r => r.status === 'active').length / (weekData.days.length * 29)) * 100)
      }
    });

  } catch (error) {
    console.error('Gabim në /api/admin/rezervimet:', error);
    res.status(500).json({
      success: false,
      error: 'Ka ndodhur një gabim gjatë ngarkimit të rezervimeve.'
    });
  }
});

// POST /api/admin/anulo-rezervim - Anulon një rezervim (admin)
router.post('/anulo-rezervim', async (req, res) => {
  try {
    const { reservationCode } = req.body;

    if (!reservationCode) {
      return res.status(400).json({
        success: false,
        error: 'Kodi i rezervimit është i detyruar.'
      });
    }

    const result = await database.cancelReservation(reservationCode);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Rezervimi nuk u gjet ose është tashmë anuluar.'
      });
    }

    res.json({
      success: true,
      message: 'Rezervimi u anulua me sukses nga administratori.',
      cancelledCode: reservationCode
    });

  } catch (error) {
    console.error('Gabim në /api/admin/anulo-rezervim:', error);
    res.status(500).json({
      success: false,
      error: 'Ka ndodhur një gabim gjatë anulimit të rezervimit.'
    });
  }
});

module.exports = router;