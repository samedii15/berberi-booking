const express = require('express');
const router = express.Router();
const moment = require('moment');
const database = process.env.DATABASE_URL 
  ? require('../database/db-pg')
  : require('../database/db');
const cleanupService = require('../services/cleanup');
const telegram = require('../services/telegram');

// POST /api/kodi/gjej - Gjen rezervim me kod
router.post('/gjej', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Kodi i rezervimit është i detyruar.'
      });
    }

    const reservation = await database.getReservationByCode(code.trim().toUpperCase());

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Nuk u gjet asnjë rezervim me këtë kod.'
      });
    }

    // Kontrollo që rezervimi është brenda javës aktuale
    const weekData = cleanupService.getCurrentWeekDates();
    const reservationDate = moment(reservation.date);
    const weekStart = moment(weekData.startDate);
    const weekEnd = moment(weekData.endDate);

    if (!reservationDate.isBetween(weekStart, weekEnd, 'day', '[]')) {
      return res.status(410).json({
        success: false,
        error: 'Ky rezervim i përket një jave të kaluar dhe nuk është më i vlefshëm.'
      });
    }

    res.json({
      success: true,
      reservation: {
        id: reservation.id,
        code: reservation.reservation_code,
        name: reservation.full_name,
        date: reservation.date,
        startTime: reservation.start_time,
        endTime: reservation.end_time,
        display: `${reservation.start_time} - ${reservation.end_time}`,
        dayName: moment(reservation.date).format('dddd'),
        fullDate: moment(reservation.date).format('dddd, D MMMM YYYY'),
        status: reservation.status,
        createdAt: reservation.created_at
      }
    });

  } catch (error) {
    console.error('Gabim në /api/kodi/gjej:', error);
    res.status(500).json({
      success: false,
      error: 'Ka ndodhur një gabim gjatë kërkimit të rezervimit.'
    });
  }
});

// POST /api/kodi/anulo - Anulon rezervim me kod
router.post('/anulo', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Kodi i rezervimit është i detyruar.'
      });
    }

    // Kontroll që rezervimi ekziston
    const reservation = await database.getReservationByCode(code.trim().toUpperCase());
    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Nuk u gjet asnjë rezervim me këtë kod.'
      });
    }

    // Anulo rezervimin
    const result = await database.cancelReservation(code.trim().toUpperCase());

    if (result.changes === 0) {
      return res.status(400).json({
        success: false,
        error: 'Rezervimi nuk mund të anulohet. Mund të jetë tashmë anuluar.'
      });
    }

    // Dërgo njoftim në Telegram
    telegram.notifyReservationCancelled({
      full_name: reservation.full_name,
      date: moment(reservation.date).format('DD MMMM YYYY'),
      start_time: reservation.start_time,
      end_time: reservation.end_time,
      code: reservation.reservation_code
    }).catch(err => console.error('Telegram notification failed:', err));

    res.json({
      success: true,
      message: 'Rezervimi u anulua me sukses!',
      cancelledReservation: {
        code: reservation.reservation_code,
        name: reservation.full_name,
        date: reservation.date,
        time: `${reservation.start_time} - ${reservation.end_time}`,
        dayName: moment(reservation.date).format('dddd')
      }
    });

  } catch (error) {
    console.error('Gabim në /api/kodi/anulo:', error);
    res.status(500).json({
      success: false,
      error: 'Ka ndodhur një gabim gjatë anulimit të rezervimit.'
    });
  }
});

// POST /api/kodi/ndrysho - Ndryshon rezervim me kod
router.post('/ndrysho', async (req, res) => {
  try {
    const { code, new_date, new_start_time } = req.body;

    if (!code || !new_date || !new_start_time) {
      return res.status(400).json({
        success: false,
        error: 'Kodi, data dhe ora e re janë të detyrueshme.'
      });
    }

    // Kontroll që rezervimi origjinal ekziston
    const originalReservation = await database.getReservationByCode(code.trim().toUpperCase());
    if (!originalReservation) {
      return res.status(404).json({
        success: false,
        error: 'Nuk u gjet asnjë rezervim me këtë kod.'
      });
    }

    // Kontrollo që data e re është brenda javës aktuale
    const weekData = cleanupService.getCurrentWeekDates();
    const newDate = moment(new_date);
    const weekStart = moment(weekData.startDate);
    const weekEnd = moment(weekData.endDate);

    if (!newDate.isBetween(weekStart, weekEnd, 'day', '[]')) {
      return res.status(400).json({
        success: false,
        error: 'Rezervimi mund të ndryshohet vetëm brenda javës aktuale.'
      });
    }

    // Kontrollo që data e re nuk është e Diel
    if (newDate.isoWeekday() === 7) {
      return res.status(400).json({
        success: false,
        error: 'E Diela është pushim. Ju lutem zgjidhni një ditë tjetër.'
      });
    }

    // Validim për orarin e punës
    const timeSlot = moment(new_start_time, 'HH:mm');
    if (timeSlot.hour() < 9 || timeSlot.hour() >= 20) {
      return res.status(400).json({
        success: false,
        error: 'Orari i punës është nga 09:00 deri në 20:00.'
      });
    }

    // Kalkulon end_time të ri
    const newEndTime = timeSlot.clone().add(25, 'minutes').format('HH:mm');

    // Kontrollo që slot-i i ri të jetë brenda orarit
    if (moment(newEndTime, 'HH:mm').hour() >= 20 && moment(newEndTime, 'HH:mm').minute() > 0) {
      return res.status(400).json({
        success: false,
        error: 'Slot-i i ri kalon orarin e punës.'
      });
    }

    // Kontrollo që slot-i i ri të jetë i lirë (përveç rezervimit aktual)
    const existingReservations = await database.getWeekReservations(weekData.startDate, weekData.endDate);
    const conflictingReservation = existingReservations.find(r => 
      r.date === new_date && 
      r.start_time === new_start_time && 
      r.id !== originalReservation.id &&
      r.status === 'active'
    );

    if (conflictingReservation) {
      return res.status(409).json({
        success: false,
        error: 'Slot-i i ri është tashmë i zënë. Ju lutem zgjidhni një slot tjetër.'
      });
    }

    // Përditëso rezervimin
    const result = await database.updateReservation(
      code.trim().toUpperCase(),
      new_date,
      new_start_time,
      newEndTime
    );

    if (result.changes === 0) {
      return res.status(400).json({
        success: false,
        error: 'Rezervimi nuk mund të ndryshohej. Ju lutem kontaktoni administratorin.'
      });
    }

    res.json({
      success: true,
      message: 'Rezervimi u ndryshua me sukses!',
      updatedReservation: {
        code: originalReservation.reservation_code,
        name: originalReservation.full_name,
        oldDate: originalReservation.date,
        oldTime: `${originalReservation.start_time} - ${originalReservation.end_time}`,
        newDate: new_date,
        newTime: `${new_start_time} - ${newEndTime}`,
        newDayName: newDate.format('dddd'),
        newFullDate: newDate.format('dddd, D MMMM YYYY')
      }
    });

  } catch (error) {
    console.error('Gabim në /api/kodi/ndrysho:', error);
    res.status(500).json({
      success: false,
      error: 'Ka ndodhur një gabim gjatë ndryshimit të rezervimit.'
    });
  }
});

module.exports = router;