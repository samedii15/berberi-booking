const moment = require('moment');

function generateDaySlots(date) {
  const slots = [];
  const workStart = 9;
  const workEnd = 20;
  const slotDuration = 30;
  const now = moment();
  const slotDate = moment(date);
  const isToday = slotDate.isSame(now, 'day');

  console.log(`\nGenerating slots for: ${date}`);
  console.log(`Current time: ${now.format('YYYY-MM-DD HH:mm:ss')}`);
  console.log(`Is today: ${isToday}\n`);

  for (let hour = workStart; hour < workEnd; hour++) {
    for (let minute = 0; minute < 60; minute += slotDuration) {
      // Create start and end times on the correct date
      const startTime = moment(date).hour(hour).minute(minute).second(0);
      const endTime = startTime.clone().add(slotDuration, 'minutes');
      
      if (endTime.hour() > workEnd || (endTime.hour() === workEnd && endTime.minute() > 0)) {
        break;
      }

      let shouldSkip = false;
      if (isToday) {
        if (endTime.isSameOrBefore(now)) {
          shouldSkip = true;
        }
      }

      if (!shouldSkip) {
        slots.push({
          startTime: startTime.format('HH:mm'),
          endTime: endTime.format('HH:mm')
        });
      } else {
        console.log(`SKIPPED: ${startTime.format('HH:mm')}-${endTime.format('HH:mm')} (ended before ${now.format('HH:mm')})`);
      }
    }
  }

  return slots;
}

// Test with today
const today = moment().format('YYYY-MM-DD');
const slots = generateDaySlots(today);

console.log(`\n✅ Generated ${slots.length} available slots:`);
slots.slice(0, 5).forEach(slot => {
  console.log(`  ${slot.startTime} - ${slot.endTime}`);
});
