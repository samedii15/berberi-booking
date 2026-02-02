const moment = require('moment');
const database = require('../database/db');

class CleanupService {
  constructor() {
    this.cleanupInterval = null;
  }

  startWeeklyCleanup() {
    // Ekzekuto cleanup në nisje të serverit
    this.performCleanup();

    // Cakto cleanup çdo 1 minutë për të fshirë slot-et që kalojnë
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 1 * 60 * 1000); // çdo 1 minutë

    console.log('🧹 Cleanup service u nis - kontrollon çdo 1 minutë për rezervime të kaluara');
  }

  async performCleanup() {
    try {
      const now = moment();
      const currentDate = now.format('YYYY-MM-DD');
      const currentTime = now.format('HH:mm');

      // Fshi rezervimet që kanë kaluar (data e kaluar)
      const result = await database.deleteOldReservations(currentDate);
      
      // Fshi rezervimet e sotit që kanë përfunduar (end_time ka kaluar)
      const todayOldSlots = await database.deletePastTimeSlotsToday(currentDate, currentTime);
      
      const totalDeleted = (result.deleted || 0) + (todayOldSlots || 0);
      
      if (totalDeleted > 0) {
        console.log(`🗑️  U fshinë ${totalDeleted} rezervime të kaluara`);
      }
    } catch (error) {
      console.error('❌ Gabim gjatë cleanup:', error);
    }
  }

  // Kthen javën aktuale (Hënë-Shtunë) me formatimin e duhur
  getCurrentWeekDates() {
    const now = moment();
    let currentDate = now.clone();
    const days = [];
    let daysAdded = 0;
    
    // Gjej 6 ditë të disponueshme duke filluar nga sot
    while (daysAdded < 6) {
      const dayOfWeek = currentDate.isoWeekday(); // 1=Monday, 7=Sunday
      
      // Kapërce të Dielen (dita 7)
      if (dayOfWeek === 7) {
        currentDate.add(1, 'day');
        continue;
      }
      
      // Kontrollo nëse kjo ditë ka slot të disponueshëm
      const isToday = currentDate.isSame(now, 'day');
      let hasAvailableSlots = true;
      
      if (isToday) {
        // Kontrollo nëse ka ende slot të disponueshëm sot
        const workEnd = 20; // 20:00
        const currentHour = now.hour();
        const currentMinute = now.minute();
        
        // Nëse është pas orës 19:35 (sloti i fundit fillon në 19:35), nuk ka më slot
        if (currentHour > 19 || (currentHour === 19 && currentMinute >= 35)) {
          hasAvailableSlots = false;
        }
      }
      
      if (hasAvailableSlots) {
        days.push({
          date: currentDate.format('YYYY-MM-DD'),
          dayName: currentDate.format('dddd'),
          dayShort: currentDate.format('ddd'),
          dayNumber: currentDate.format('DD'),
          month: currentDate.format('MMMM'),
          isToday: isToday
        });
        daysAdded++;
      }
      
      currentDate.add(1, 'day');
    }
    
    // Përcakto startDate dhe endDate bazuar në ditët e zgjedhura
    const startDate = days[0].date;
    const endDate = days[days.length - 1].date;
    const startMoment = moment(startDate);

    return {
      startDate: startDate,
      endDate: endDate,
      weekNumber: startMoment.isoWeek(),
      year: startMoment.year(),
      days: days
    };
  }

  // Gjeneron slot-et për një ditë të caktuar
  generateDaySlots(date) {
    const slots = [];
    const workStart = 9; // 09:00
    const workEnd = 20;   // 20:00
    const slotDuration = 25; // 25 minuta
    const now = moment();
    const slotDate = moment(date);
    const isToday = slotDate.isSame(now, 'day');

    for (let hour = workStart; hour < workEnd; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        // Create start and end times on the correct date
        const startTime = moment(date).hour(hour).minute(minute).second(0);
        const endTime = startTime.clone().add(slotDuration, 'minutes');
        
        // Kontrollo që slot-i të mos kalojë orën 20:00
        if (endTime.hour() > workEnd || (endTime.hour() === workEnd && endTime.minute() > 0)) {
          break;
        }

        // Nëse është sot, shfaq vetëm slot-et që nuk kanë përfunduar ende
        if (isToday) {
          // Fshi slot-in nëse ka përfunduar (ora e fundit ka kaluar)
          if (endTime.isSameOrBefore(now)) {
            continue; // Kapërce slot-et që kanë përfunduar
          }
        }

        slots.push({
          date: date,
          startTime: startTime.format('HH:mm'),
          endTime: endTime.format('HH:mm'),
          display: `${startTime.format('HH:mm')} - ${endTime.format('HH:mm')}`,
          isAvailable: true, // do të përdităsohet nga rezervimet
          reserved: null
        });
      }
    }

    return slots;
  }

  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Cleanup service u ndalua');
    }
  }
}

module.exports = new CleanupService();