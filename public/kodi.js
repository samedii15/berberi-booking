// Code Management Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initCodePage();
});

let currentReservation = null;
let weekData = null;
let selectedNewSlot = null;

function initCodePage() {
    // Auto-focus on code input
    const codeInput = document.getElementById('reservation-code');
    codeInput.focus();
    
    // Format code input as user types
    codeInput.addEventListener('input', function(e) {
        let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (value.length > 6) value = value.substring(0, 6);
        e.target.value = value;
    });
    
    // Handle form submission
    document.getElementById('code-form').addEventListener('submit', handleCodeSubmission);
}

async function handleCodeSubmission(e) {
    e.preventDefault();
    
    const codeInput = document.getElementById('reservation-code');
    const submitBtn = document.getElementById('code-submit');
    const messageContainer = document.getElementById('code-message');
    
    const code = codeInput.value.trim().toUpperCase();
    
    // Clear previous messages
    messageContainer.style.display = 'none';
    messageContainer.className = 'code-message';
    
    // Validation
    if (code.length !== 6) {
        showCodeMessage('Kodi duhet të ketë 6 karaktere.', 'error');
        return;
    }
    
    // Show loading state
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="spinner"></div> Duke kërkuar...';
    submitBtn.disabled = true;
    
    try {
        const response = await App.apiRequest('/api/kodi/gjej', {
            method: 'POST',
            body: JSON.stringify({ code })
        });
        
        if (response.success) {
            currentReservation = response.reservation;
            showReservationDetails(response.reservation);
        } else {
            showCodeMessage(response.error, 'error');
        }
        
    } catch (error) {
        console.error('Code search failed:', error);
        showCodeMessage('Ka ndodhur një gabim gjatë kërkimit. Ju lutem provoni përsëri.', 'error');
    } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showCodeMessage(message, type = 'info') {
    const messageContainer = document.getElementById('code-message');
    messageContainer.className = `code-message ${type}`;
    messageContainer.textContent = message;
    messageContainer.style.display = 'block';
}

function showReservationDetails(reservation) {
    // Update display elements
    document.getElementById('display-code').textContent = reservation.code;
    document.getElementById('detail-name').textContent = reservation.name;
    document.getElementById('detail-date').textContent = reservation.fullDate;
    document.getElementById('detail-time').textContent = reservation.display;
    document.getElementById('detail-day').textContent = reservation.dayName;
    
    // Hide code entry section and show reservation section
    document.getElementById('code-entry-section').style.display = 'none';
    document.getElementById('reservation-section').style.display = 'block';
    
    // Attach button event listeners after section is visible
    setTimeout(() => {
        const changeBtn = document.querySelector('.reservation-actions .btn-secondary');
        const cancelBtn = document.querySelector('.reservation-actions .btn-danger');
        const searchBtn = document.querySelector('.reservation-footer .btn-text');
        
        if (changeBtn) {
            changeBtn.onclick = showChangeModal;
        }
        if (cancelBtn) {
            cancelBtn.onclick = showCancelModal;
        }
        if (searchBtn) {
            searchBtn.onclick = searchAnother;
        }
    }, 100);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function searchAnother() {
    // Reset form
    document.getElementById('reservation-code').value = '';
    document.getElementById('code-message').style.display = 'none';
    
    // Show code entry section and hide reservation section
    document.getElementById('code-entry-section').style.display = 'block';
    document.getElementById('reservation-section').style.display = 'none';
    
    // Reset state
    currentReservation = null;
    weekData = null;
    selectedNewSlot = null;
    
    // Focus on input
    setTimeout(() => {
        document.getElementById('reservation-code').focus();
    }, 300);
}

// Change Reservation Modal
async function showChangeModal() {
    if (!currentReservation) return;
    
    // Update current reservation display
    document.getElementById('current-display').textContent = 
        `${currentReservation.fullDate} në ${currentReservation.display}`;
    
    // Show modal
    const modal = document.getElementById('change-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    
    // Attach modal button event listeners
    setTimeout(() => {
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-actions .btn-secondary');
        const confirmBtn = modal.querySelector('#confirm-change');
        
        if (closeBtn) closeBtn.onclick = closeChangeModal;
        if (cancelBtn) cancelBtn.onclick = closeChangeModal;
        if (confirmBtn) confirmBtn.onclick = confirmChange;
    }, 50);
    
    // Load available slots
    await loadSlotsForChange();
}

async function loadSlotsForChange() {
    const loadingEl = document.getElementById('change-loading');
    const daysEl = document.getElementById('change-days');
    const slotsEl = document.getElementById('change-slots');
    
    // Show loading
    loadingEl.style.display = 'flex';
    daysEl.style.display = 'none';
    slotsEl.style.display = 'none';
    
    try {
        const response = await App.apiRequest('/api/java');
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to load calendar');
        }
        
        weekData = response.week;
        
        // Hide loading
        loadingEl.style.display = 'none';
        
        // Show days
        renderChangeDays(weekData.days);
        daysEl.style.display = 'flex';
        
    } catch (error) {
        console.error('Failed to load slots for change:', error);
        showChangeMessage('Ka ndodhur një gabim gjatë ngarkimit të slot-eve. Ju lutem provoni përsëri.', 'error');
        
        // Hide loading
        loadingEl.style.display = 'none';
    }
}

function renderChangeDays(days) {
    const container = document.getElementById('change-days');
    container.innerHTML = '';
    
    days.forEach((day, index) => {
        const dayEl = document.createElement('div');
        dayEl.className = 'change-day';
        
        // Check if this day has available slots
        const availableSlots = day.slots.filter(slot => 
            slot.isAvailable || 
            (slot.reserved && slot.reserved.code === currentReservation.code)
        );
        
        if (availableSlots.length === 0) {
            dayEl.classList.add('disabled');
        }
        
        dayEl.innerHTML = `
            <div class="day-name">${day.dayShort}</div>
            <div class="day-number">${day.dayNumber}</div>
        `;
        
        if (!dayEl.classList.contains('disabled')) {
            dayEl.addEventListener('click', () => selectChangeDay(day, dayEl));
        }
        
        container.appendChild(dayEl);
    });
}

function selectChangeDay(day, dayEl) {
    // Remove active class from all day elements
    document.querySelectorAll('.change-day').forEach(el => {
        el.classList.remove('active');
    });
    
    // Add active class to selected day
    dayEl.classList.add('active');
    
    // Show slots for this day
    renderChangeSlots(day);
}

function renderChangeSlots(day) {
    const container = document.getElementById('change-slots');
    container.innerHTML = '';
    
    // Filter slots - show available ones and the current reservation slot
    const availableSlots = day.slots.filter(slot => 
        slot.isAvailable || 
        (slot.reserved && slot.reserved.code === currentReservation.code)
    );
    
    if (availableSlots.length === 0) {
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #a0aec0;">
                Asnjë slot i disponueshëm për këtë ditë
            </div>
        `;
        document.getElementById('change-slots').style.display = 'block';
        return;
    }
    
    availableSlots.forEach(slot => {
        const slotEl = document.createElement('div');
        slotEl.className = 'change-slot';
        
        const isCurrentSlot = slot.reserved && slot.reserved.code === currentReservation.code;
        
        if (isCurrentSlot) {
            slotEl.classList.add('disabled');
        }
        
        slotEl.innerHTML = `
            <div class="change-slot-time">${slot.display}</div>
            <div class="change-slot-status ${slot.isAvailable ? 'available' : 'occupied'}">
                ${isCurrentSlot ? 'Aktual' : (slot.isAvailable ? 'I lirë' : 'I zënë')}
            </div>
        `;
        
        if (!isCurrentSlot && slot.isAvailable) {
            slotEl.addEventListener('click', () => selectChangeSlot(slot, slotEl, day));
        }
        
        container.appendChild(slotEl);
    });
    
    document.getElementById('change-slots').style.display = 'block';
}

function selectChangeSlot(slot, slotEl, day) {
    // Remove selected class from all slots
    document.querySelectorAll('.change-slot').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selected class
    slotEl.classList.add('selected');
    
    // Store selected slot
    selectedNewSlot = { ...slot, date: day.date, dayName: day.dayName };
    
    // Enable confirm button
    document.getElementById('confirm-change').disabled = false;
}

function closeChangeModal() {
    const modal = document.getElementById('change-modal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
        // Reset state
        selectedNewSlot = null;
        weekData = null;
        document.getElementById('confirm-change').disabled = true;
    }, 300);
}

async function confirmChange() {
    if (!selectedNewSlot || !currentReservation) return;
    
    const confirmBtn = document.getElementById('confirm-change');
    const originalText = confirmBtn.innerHTML;
    
    // Show loading
    confirmBtn.innerHTML = '<div class="spinner"></div> Duke ndryshuar...';
    confirmBtn.disabled = true;
    
    try {
        const response = await App.apiRequest('/api/kodi/ndrysho', {
            method: 'POST',
            body: JSON.stringify({
                code: currentReservation.code,
                new_date: selectedNewSlot.date,
                new_start_time: selectedNewSlot.startTime
            })
        });
        
        if (response.success) {
            // Close change modal
            closeChangeModal();
            
            // Show success modal
            showSuccessModal('Rezervimi u ndryshua me sukses!', {
                old: `${currentReservation.fullDate} në ${currentReservation.display}`,
                new: `${App.getDayName(selectedNewSlot.date)}, ${App.formatDate(selectedNewSlot.date)} në ${selectedNewSlot.display}`
            });
            
        } else {
            showChangeMessage(response.error, 'error');
        }
        
    } catch (error) {
        console.error('Change failed:', error);
        showChangeMessage('Ka ndodhur një gabim gjatë ndryshimit. Ju lutem provoni përsëri.', 'error');
    } finally {
        // Reset button
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

function showChangeMessage(message, type = 'info') {
    const messageContainer = document.getElementById('change-message');
    messageContainer.className = `change-message ${type}`;
    messageContainer.textContent = message;
    messageContainer.style.display = 'block';
}

// Cancel Reservation Modal
function showCancelModal() {
    if (!currentReservation) return;
    
    // Update cancel display
    document.getElementById('cancel-display').textContent = 
        `${currentReservation.fullDate} në ${currentReservation.display}`;
    
    // Show modal
    const modal = document.getElementById('cancel-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    
    // Attach modal button event listeners
    setTimeout(() => {
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-actions .btn-secondary');
        const confirmBtn = modal.querySelector('#confirm-cancel');
        
        if (closeBtn) closeBtn.onclick = closeCancelModal;
        if (cancelBtn) cancelBtn.onclick = closeCancelModal;
        if (confirmBtn) confirmBtn.onclick = confirmCancel;
    }, 50);
}

function closeCancelModal() {
    const modal = document.getElementById('cancel-modal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

async function confirmCancel() {
    if (!currentReservation) return;
    
    const confirmBtn = document.getElementById('confirm-cancel');
    const originalText = confirmBtn.innerHTML;
    
    // Show loading
    confirmBtn.innerHTML = '<div class="spinner"></div> Duke anuluar...';
    confirmBtn.disabled = true;
    
    try {
        const response = await App.apiRequest('/api/kodi/anulo', {
            method: 'POST',
            body: JSON.stringify({
                code: currentReservation.code
            })
        });
        
        if (response.success) {
            // Close cancel modal
            closeCancelModal();
            
            // Show success modal
            showSuccessModal('Rezervimi u anulua me sukses!', {
                cancelled: `${currentReservation.fullDate} në ${currentReservation.display}`
            });
            
        } else {
            showCancelMessage(response.error, 'error');
        }
        
    } catch (error) {
        console.error('Cancel failed:', error);
        showCancelMessage('Ka ndodhur një gabim gjatë anulimit. Ju lutem provoni përsëri.', 'error');
    } finally {
        // Reset button
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

function showCancelMessage(message, type = 'info') {
    const messageContainer = document.getElementById('cancel-message');
    messageContainer.className = `cancel-message ${type}`;
    messageContainer.textContent = message;
    messageContainer.style.display = 'block';
}

// Success Modal
function showSuccessModal(title, details) {
    document.getElementById('success-title').textContent = `✅ ${title}`;
    document.getElementById('success-message').textContent = title;
    
    let detailsHtml = '';
    if (details.old && details.new) {
        detailsHtml = `
            <div style="margin-bottom: 1rem;">
                <strong>Nga:</strong> ${details.old}
            </div>
            <div>
                <strong>Në:</strong> ${details.new}
            </div>
        `;
    } else if (details.cancelled) {
        detailsHtml = `
            <div>
                <strong>Anuluar:</strong> ${details.cancelled}
            </div>
        `;
    }
    
    document.getElementById('success-details').innerHTML = detailsHtml;
    
    // Show modal
    const modal = document.getElementById('success-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    
    // Attach button event listeners
    setTimeout(() => {
        const homeBtn = modal.querySelector('.modal-actions .btn-secondary');
        const searchBtn = modal.querySelector('.modal-actions .btn-primary');
        
        if (homeBtn) {
            homeBtn.onclick = () => window.location.href = '/';
        }
        if (searchBtn) {
            searchBtn.onclick = () => window.location.reload();
        }
    }, 50);
}