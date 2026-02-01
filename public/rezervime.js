// Rezervime Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initReservationsPage();
});

async function initReservationsPage() {
    try {
        // Set up form submission handler
        const bookingForm = document.getElementById('booking-form');
        if (bookingForm) {
            bookingForm.addEventListener('submit', handleBookingSubmit);
            console.log('Booking form handler attached');
        }
        
        await loadWeeklyCalendar();
    } catch (error) {
        console.error('Failed to initialize reservations page:', error);
        showErrorState('Ka ndodhur një gabim gjatë ngarkimit. Ju lutem rifreskoni faqen.');
    }
}

async function loadWeeklyCalendar() {
    try {
        const data = await App.apiRequest('/api/java');
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to load calendar');
        }
        
        App.currentWeek = data.week;
        
        // Update week info
        updateWeekInfo(data.week);
        
        // Render days
        renderDays(data.week.days);
        
        // Update statistics
        updateStatistics(data.meta);
        
        // Hide loading and show content
        document.getElementById('loading').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        
    } catch (error) {
        console.error('Failed to load weekly calendar:', error);
        showErrorState(error.message || 'Ka ndodhur një gabim gjatë ngarkimit të kalendarit.');
    }
}

function updateWeekInfo(week) {
    const weekTitle = document.getElementById('week-title');
    const weekSubtitle = document.getElementById('week-subtitle');
    
    weekTitle.textContent = `Java ${week.weekNumber}, ${week.year}`;
    
    const startDate = App.formatDate(week.startDate);
    const endDate = App.formatDate(week.endDate);
    weekSubtitle.textContent = `${startDate} - ${endDate}`;
}

function updateStatistics(meta) {
    const availableCount = document.getElementById('available-count');
    const reservedCount = document.getElementById('reserved-count');
    
    availableCount.textContent = meta.availableSlots;
    reservedCount.textContent = meta.reservedSlots;
}

function renderDays(days) {
    const container = document.getElementById('days-container');
    container.innerHTML = '';
    
    days.forEach((day, index) => {
        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        if (day.isToday) dayCard.classList.add('today');
        
        dayCard.innerHTML = `
            <div class="day-name">${day.dayShort}</div>
            <div class="day-number">${day.dayNumber}</div>
            <div class="day-month">${day.month.substring(0, 3)}</div>
        `;
        
        dayCard.addEventListener('click', () => selectDay(day, dayCard));
        container.appendChild(dayCard);
        
        // Auto-select today if available
        if (day.isToday && !App.selectedDay) {
            setTimeout(() => selectDay(day, dayCard), 100);
        }
    });
    
    // If no today, select first day
    if (!App.selectedDay && days.length > 0) {
        setTimeout(() => {
            const firstCard = container.firstElementChild;
            selectDay(days[0], firstCard);
        }, 100);
    }
}

function selectDay(day, dayCard) {
    // Remove active class from all day cards
    document.querySelectorAll('.day-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Add active class to selected card
    dayCard.classList.add('active');
    
    // Update selected day
    App.selectedDay = day;
    
    // Update slots header
    const selectedDayTitle = document.getElementById('selected-day-title');
    const selectedDaySubtitle = document.getElementById('selected-day-subtitle');
    
    selectedDayTitle.textContent = `${day.dayName}, ${day.dayNumber} ${day.month}`;
    selectedDaySubtitle.textContent = `${day.slots.filter(s => s.isAvailable).length} slot-e të lira`;
    
    // Render slots for selected day
    renderSlots(day.slots);
}

function renderSlots(slots) {
    const container = document.getElementById('slots-container');
    container.innerHTML = '';
    
    if (slots.length === 0) {
        container.innerHTML = `
            <div class="no-day-selected">
                <div class="no-day-icon">😴</div>
                <h4>Asnjë slot i disponueshëm</h4>
                <p>Kjo ditë nuk ka slot-e të disponueshëm</p>
            </div>
        `;
        return;
    }
    
    slots.forEach(slot => {
        const slotCard = document.createElement('div');
        slotCard.className = `slot-card ${slot.isAvailable ? 'available' : 'occupied'}`;
        
        slotCard.innerHTML = `
            <div class="slot-time">${slot.display}</div>
            <div class="slot-status ${slot.isAvailable ? 'available' : 'occupied'}">
                ${slot.isAvailable ? 'I lirë' : 'I zënë'}
            </div>
        `;
        
        if (slot.isAvailable) {
            slotCard.addEventListener('click', () => openBookingModal(slot));
        }
        
        container.appendChild(slotCard);
    });
}

function openBookingModal(slot) {
    if (!slot || !slot.isAvailable) return;
    
    App.selectedSlot = slot;
    
    // Update modal content
    document.getElementById('booking-day').textContent = App.selectedDay.dayName;
    document.getElementById('booking-date').textContent = App.formatDate(App.selectedDay.date);
    document.getElementById('booking-time').textContent = slot.display;
    
    // Clear form
    document.getElementById('full-name').value = '';
    document.getElementById('booking-message').style.display = 'none';
    
    // Show modal
    const modal = document.getElementById('booking-modal');
    modal.style.display = 'flex';
    modal.classList.add('active');
    
    // Attach event listeners with small delay to ensure DOM is ready
    setTimeout(() => {
        const closeBtn = document.getElementById('booking-modal-close');
        if (closeBtn) {
            closeBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Booking close X clicked');
                closeBookingModal();
            };
            console.log('✓ Booking close button attached');
        }
        
        const cancelBtn = document.getElementById('booking-cancel');
        if (cancelBtn) {
            cancelBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Booking Anulo clicked');
                closeBookingModal();
            };
            console.log('✓ Booking cancel button attached');
        }
        
        // Focus on name field
        const nameInput = document.getElementById('full-name');
        if (nameInput) nameInput.focus();
    }, 100);
}

function closeBookingModal() {
    console.log('closeBookingModal called');
    const modal = document.getElementById('booking-modal');
    modal.classList.remove('active');
    modal.style.display = 'none';
    App.selectedSlot = null;
    
    // Clear form
    const form = document.getElementById('booking-form');
    if (form) form.reset();
    
    // Clear selection
    document.querySelectorAll('.slot.selected').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Clear any messages
    const messageEl = document.getElementById('booking-message');
    if (messageEl) messageEl.style.display = 'none';
}

// Legacy function for backwards compatibility
function selectSlot() {
    console.log('selectSlot called (deprecated)');
}

// Handle booking form submission
async function handleBookingSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('booking-submit');
    const messageContainer = document.getElementById('booking-message');
    const fullName = document.getElementById('full-name').value.trim();
    
    // Clear previous messages
    messageContainer.style.display = 'none';
    messageContainer.className = 'booking-message';
    
    // Validation
    if (fullName.length < 2) {
        showBookingMessage('Emri dhe mbiemri duhet të ketë së paku 2 karaktere.', 'error');
        return;
    }
    
    if (!App.selectedSlot || !App.selectedDay) {
        console.error('Missing slot or day:', { selectedSlot: App.selectedSlot, selectedDay: App.selectedDay });
        showBookingMessage('Ka ndodhur një gabim. Ju lutem provoni përsëri.', 'error');
        return;
    }
    
    console.log('Booking data:', {
        full_name: fullName,
        date: App.selectedDay.date,
        start_time: App.selectedSlot.startTime
    });
    
    // Show loading state
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="spinner"></div> Duke rezervuar...';
    submitBtn.disabled = true;
    
    try {
        const response = await App.apiRequest('/api/rezervo', {
            method: 'POST',
            body: JSON.stringify({
                full_name: fullName,
                date: App.selectedDay.date,
                start_time: App.selectedSlot.startTime
            })
        });
        
        console.log('API response:', response);
        
        if (response.success) {
            // Close booking modal
            closeBookingModal();
            
            // Show success modal
            showSuccessModal(response.reservation);
            
            // Refresh calendar
            await loadWeeklyCalendar();
        } else {
            console.error('Booking failed:', response.error);
            showBookingMessage(response.error, 'error');
        }
        
    } catch (error) {
        console.error('Booking failed with exception:', error);
        showBookingMessage('Ka ndodhur një gabim gjatë rezervimit. Ju lutem provoni përsëri.', 'error');
    } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showBookingMessage(message, type = 'info') {
    const messageContainer = document.getElementById('booking-message');
    messageContainer.className = `booking-message ${type}`;
    messageContainer.textContent = message;
    messageContainer.style.display = 'block';
}

function showSuccessModal(reservation) {
    // Update success modal content
    document.getElementById('success-name').textContent = reservation.name;
    document.getElementById('success-day').textContent = App.getDayName(reservation.date);
    document.getElementById('success-date').textContent = App.formatDate(reservation.date);
    document.getElementById('success-time').textContent = reservation.display;
    document.getElementById('reservation-code').textContent = reservation.code;
    
    // Show modal
    const modal = document.getElementById('success-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function copyCode() {
    const code = document.getElementById('reservation-code').textContent;
    
    App.copyToClipboard(code).then(success => {
        const copyBtn = document.querySelector('.copy-code');
        const originalText = copyBtn.textContent;
        
        if (success) {
            copyBtn.textContent = '✅';
            setTimeout(() => copyBtn.textContent = originalText, 2000);
        } else {
            copyBtn.textContent = '❌';
            setTimeout(() => copyBtn.textContent = originalText, 2000);
        }
    });
}

function showErrorState(message) {
    document.getElementById('loading').innerHTML = `
        <div class="container">
            <div class="loading-content">
                <div style="font-size: 2rem; margin-bottom: 1rem;">❌</div>
                <h3>Ka ndodhur një gabim</h3>
                <p style="margin-bottom: 2rem;">${message}</p>
                <button class="btn-primary" onclick="window.location.reload()">
                    Rifresko Faqen
                </button>
            </div>
        </div>
    `;
}

// Make functions globally available for onclick handlers
window.confirmReservation = confirmReservation;
window.closeModal = closeModal;
window.resetAndGoHome = resetAndGoHome;