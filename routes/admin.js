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

    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          error: 'Ka ndodhur një gabim gjatë ruajtjes së sesionit.'
        });
      }

      console.log('Session saved successfully for admin:', admin.username);

      res.json({
        success: true,
        message: 'U hyrt me sukses si administrator.',
        admin: {
          id: admin.id,
          username: admin.username
        }
      });
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
    const restDays = await database.getRestDays(weekData.startDate, weekData.endDate);

    // Gruppo rezervimet sipas ditës
    const reservationsByDay = {};
    weekData.days.forEach(day => {
      const isRestDay = restDays.includes(day.date);
      reservationsByDay[day.date] = {
        dayInfo: day,
        reservations: [],
        isRestDay: isRestDay
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

    const totalSlots = weekData.days.reduce((sum, day) => {
      if (restDays.includes(day.date)) return sum;
      return sum + cleanupService.generateDaySlots(day.date).length;
    }, 0);

    const activeReservations = reservations.filter(r => r.status === 'active');
    const cancelledReservations = reservations.filter(r => r.status === 'cancelled');

    res.json({
      success: true,
      week: weekData,
      reservationsByDay: reservationsByDay,
      restDays: restDays,
      statistics: {
        totalReservations: reservations.length,
        activeReservations: activeReservations.length,
        cancelledReservations: cancelledReservations.length,
        totalSlots: totalSlots,
        occupancyRate: totalSlots > 0
          ? Math.round((activeReservations.length / totalSlots) * 100)
          : 0
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

// POST /api/admin/sheno-pushim - Mark a day as rest day
router.post('/sheno-pushim', requireAuth, async (req, res) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Data është e detyrueshme.'
      });
    }

    // Delete all reservations for this date
    const deleteResult = await database.deleteReservationsForDate(date);
    
    // Mark day as rest day
    await database.markDayAsRest(date);

    res.json({
      success: true,
      message: `Dita ${date} u shënua si ditë pushimi. ${deleteResult.deleted} rezervime u fshinë.`,
      date: date,
      deletedReservations: deleteResult.deleted
    });

  } catch (error) {
    console.error('Gabim në /api/admin/sheno-pushim:', error);
    res.status(500).json({
      success: false,
      error: 'Ka ndodhur një gabim gjatë shënimit të ditës së pushimit.'
    });
  }
});

// POST /api/admin/hiq-pushim - Unmark a rest day
router.post('/hiq-pushim', requireAuth, async (req, res) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Data është e detyrueshme.'
      });
    }

    const result = await database.unmarkRestDay(date);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kjo ditë nuk është e shënuar si ditë pushimi.'
      });
    }

    res.json({
      success: true,
      message: `Dita ${date} nuk është më ditë pushimi.`,
      date: date
    });

  } catch (error) {
    console.error('Gabim në /api/admin/hiq-pushim:', error);
    res.status(500).json({
      success: false,
      error: 'Ka ndodhur një gabim gjatë heqjes së ditës së pushimit.'
    });
  }
});

module.exports = router;