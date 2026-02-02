const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const database = process.env.DATABASE_URL 
  ? require('../database/db-pg')
  : require('../database/db');
const cleanupService = require('../services/cleanup');

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({
      success: false,
      error: 'Nuk jeni të autorizuar. Ju lutem hyni së pari.'
    });
  }
  next();
}

// GET /api/admin/session - Check if logged in
router.get('/session', (req, res) => {
  if (req.session && req.session.adminId) {
    res.json({
      success: true,
      loggedIn: true,
      admin: {
        id: req.session.adminId,
        username: req.session.username
      }
    });
  } else {
    res.json({
      success: true,
      loggedIn: false
    });
  }
});

// POST /api/admin/hyrje - Admin login
router.post('/hyrje', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('Login attempt for username:', username);

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Emri i përdoruesit dhe fjalëkalimi janë të detyrueshëm.'
      });
    }

    const admin = await database.getAdminByUsername(username.trim());
    if (!admin) {
      console.log('Admin user not found:', username);
      return res.status(401).json({
        success: false,
        error: 'Emri i përdoruesit ose fjalëkalimi është i gabuar.'
      });
    }

    console.log('Admin user found, verifying password...');
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', username);
      return res.status(401).json({
        success: false,
        error: 'Emri i përdoruesit ose fjalëkalimi është i gabuar.'
      });
    }

    console.log('Password valid, creating session...');
    // Set session
    req.session.adminId = admin.id;
    req.session.username = admin.username;

    console.log('Session created for admin:', admin.username);

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

// POST /api/admin/dil - Admin logout
router.post('/dil', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({
        success: false,
        error: 'Ka ndodhur një gabim gjatë daljes.'
      });
    }
    res.json({
      success: true,
      message: 'U dolët me sukses.'
    });
  });
});

// GET /api/admin/rezervimet - Lista e të gjitha rezervimeve të javës aktuale
router.get('/rezervimet', requireAuth, async (req, res) => {
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
router.post('/anulo-rezervim', requireAuth, async (req, res) => {
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