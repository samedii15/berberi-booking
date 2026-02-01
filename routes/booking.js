const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const database = process.env.DATABASE_URL 
  ? require('../database/db-pg')
  : require('../database/db');
const cleanupService = require('../services/cleanup');
const telegram = require('../services/telegram');

// POST /api/rezervo - Krijon rezervim të ri
router.post('/rezervo', async (req, res) => {
  try {
    const { full_name, date, start_time } = req.body;

    // Validimi
    if (!full_name || !date || !start_time) {
      return res.status(400).json({
        success: false,
        error: 'Të gjitha fushat janë të detyrueshme.'
      });
    }

    if (full_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Emri dhe mbiemri duhet të ketë së paku 2 karaktere.'
      });
    }

    // Kontrollo që data është brenda javës aktuale
    const weekData = cleanupService.getCurrentWeekDates();
    const requestedDate = moment(date);
    const weekStart = moment(weekData.startDate);
    const weekEnd = moment(weekData.endDate);

    if (!requestedDate.isBetween(weekStart, weekEnd, 'day', '[]')) {
      return res.status(400).json({
        success: false,
        error: 'Rezervimi mund të bëhet vetëm për javën aktuale.'
      });
    }

    // Kontrollo që data nuk është e Diel
    if (requestedDate.isoWeekday() === 7) {
      return res.status(400).json({
        success: false,
        error: 'E Diela është pushim. Ju lutem zgjidhni një ditë tjetër.'
      });
    }

    // Kontrollo që ora është brenda orarit të punës
    const timeSlot = moment(start_time, 'HH:mm');
    if (timeSlot.hour() < 8 || timeSlot.hour() >= 20) {
      return res.status(400).json({
        success: false,
        error: 'Orari i punës është nga 09:00 deri në 20:00.'
      });
    }

    // Kalkulon end_time (25 minuta më vonë)
    const endTime = timeSlot.clone().add(25, 'minutes').format('HH:mm');

    // Kontrollo që slot-i të jetë brenda orarit
    if (moment(endTime, 'HH:mm').hour() >= 20 && moment(endTime, 'HH:mm').minute() > 0) {
      return res.status(400).json({
        success: false,
        error: 'Slot-i i zgjedhur kalon orarin e punës.'
      });
    }

    // Gjenero kod unik rezervimi
    let reservationCode;
    let isCodeUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isCodeUnique && attempts < maxAttempts) {
      reservationCode = generateReservationCode();
      try {
        const existingReservation = await database.getReservationByCode(reservationCode);
        isCodeUnique = !existingReservation;
      } catch (error) {
        // Nëse gabimi është që nuk u gjet rezervim, atëherë kodi është unik
        isCodeUnique = true;
      }
      attempts++;
    }

    if (!isCodeUnique) {
      return res.status(500).json({
        success: false,
        error: 'Nuk mund të gjenerojmë kod rezervimi. Ju lutem provoni përsëri.'
      });
    }

    // Krijo rezervimin
    const result = await database.createReservation(
      full_name.trim(),
      date,
      start_time,
      endTime,
      reservationCode
    );

    // Dërgo njoftim në Telegram
    telegram.notifyNewReservation({
      full_name: full_name.trim(),
      date: moment(date).format('DD MMMM YYYY'),
      start_time: start_time,
      end_time: endTime,
      code: reservationCode
    }).catch(err => console.error('Telegram notification failed:', err));

    res.json({
      success: true,
      message: 'Termini u rezervua me sukses!',
      reservation: {
        id: result.id,
        code: reservationCode,
        name: full_name.trim(),
        date: date,
        startTime: start_time,
        endTime: endTime,
        display: `${start_time} - ${endTime}`
      }
    });

  } catch (error) {
    console.error('Gabim në /api/rezervo:', error);
    
    // Kontrollo për konfliktin e slot-it (UNIQUE constraint)
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        success: false,
        error: 'Ky slot është tashmë i rezervuar. Ju lutem zgjidhni një slot tjetër.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Ka ndodhur një gabim gjatë rezervimit. Ju lutem provoni përsëri.'
    });
  }
});

// Funksion për gjenerimin e kodit të rezervimit
function generateReservationCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = router;