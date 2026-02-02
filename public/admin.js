// Admin Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initAdminPage();
});

let isLoggedIn = false;
let adminData = null;
let reservationsData = null;
let selectedReservationForCancel = null;

function initAdminPage() {
    // Check if already logged in via session
    checkLoginStatus();
    
    // Setup login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

async function checkLoginStatus() {
    try {
        const response = await App.apiRequest('/api/admin/session');
        
        if (response.success && response.loggedIn) {
            adminData = response.admin;
            isLoggedIn = true;
            
            // Hide login section and show dashboard
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('back-btn').style.display = 'inline-flex';
            document.getElementById('logout-btn').style.display = 'inline-flex';
            
            // Load dashboard
            await loadDashboard();
        } else {
            // Show login section
            document.getElementById('login-section').style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to check login status:', error);
        // Show login section on error
        document.getElementById('login-section').style.display = 'block';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('login-submit');
    const messageContainer = document.getElementById('login-message');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    // Clear previous messages
    messageContainer.style.display = 'none';
    messageContainer.className = 'login-message';
    
    // Basic validation
    if (!username || !password) {
        showLoginMessage('Ju lutem plotësoni të gjitha fushat.', 'error');
        return;
    }
    
    // Show loading state
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="spinner"></div> Duke hyrë...';
    submitBtn.disabled = true;
    
    try {
        const response = await App.apiRequest('/api/admin/hyrje', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (response.success) {
            adminData = response.admin;
            isLoggedIn = true;
            
            // Hide login section and show dashboard
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('back-btn').style.display = 'block';
            document.getElementById('logout-btn').style.display = 'block';
            
            // Load dashboard
            await loadDashboard();
        } else {
            showLoginMessage(response.error, 'error');
        }
        
    } catch (error) {
        console.error('Login failed:', error);
        showLoginMessage('Ka ndodhur një gabim gjatë hyrjes. Ju lutem provoni përsëri.', 'error');
    } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showLoginMessage(message, type = 'info') {
    const messageContainer = document.getElementById('login-message');
    messageContainer.className = `login-message ${type}`;
    messageContainer.textContent = message;
    messageContainer.style.display = 'block';
}

async function loadDashboard() {
    // Show loading
    const loadingEl = document.getElementById('loading-dashboard');
    loadingEl.style.display = 'block';
    
    try {
        await loadReservations();
        
        // Hide loading and show dashboard
        loadingEl.style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'block';
        
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        
        // Create retry button with proper event listener
        loadingEl.innerHTML = `
            <div class="container">
                <div class="loading-content">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">❌</div>
                    <h3>Ka ndodhur një gabim</h3>
                    <p style="margin-bottom: 2rem;">Nuk mund të ngarkohet dashboard-i.</p>
                    <button class="btn-primary" id="retry-dashboard-btn">
                        Provo Përsëri
                    </button>
                </div>
            </div>
        `;
        
        // Add event listener to retry button
        setTimeout(() => {
            const retryBtn = document.getElementById('retry-dashboard-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    loadingEl.innerHTML = `
                        <div class="container">
                            <div class="loading-content">
                                <div class="spinner-large"></div>
                                <p>Duke ngarkuar rezervimet...</p>
                            </div>
                        </div>
                    `;
                    loadDashboard();
                });
            }
        }, 100);
    }
}

async function loadReservations() {
    try {
        const response = await App.apiRequest('/api/admin/rezervimet');
        
        if (!response.success) {
            // Check if it's an authentication error
            if (response.error && response.error.includes('autorizuar')) {
                // User is not authenticated, redirect to login
                isLoggedIn = false;
                adminData = null;
                document.getElementById('dashboard-section').style.display = 'none';
                document.getElementById('loading-dashboard').style.display = 'none';
                document.getElementById('login-section').style.display = 'block';
                document.getElementById('back-btn').style.display = 'none';
                document.getElementById('logout-btn').style.display = 'none';
                throw new Error('Session expired. Please login again.');
            }
            throw new Error(response.error || 'Failed to load reservations');
        }
        
        reservationsData = response;
        
        // Update week info
        updateWeekInfo(response.week);
        
        // Update statistics
        updateStatistics(response.statistics);
        
        // Render reservations by day
        renderReservationsByDay(response.reservationsByDay);
        
    } catch (error) {
        console.error('Failed to load reservations:', error);
        throw error;
    }
}

function updateWeekInfo(week) {
    const weekTitle = document.getElementById('week-title-admin');
    const weekSubtitle = document.getElementById('week-subtitle-admin');
    
    weekTitle.textContent = `Java ${week.weekNumber}, ${week.year}`;
    
    const startDate = App.formatDate(week.startDate);
    const endDate = App.formatDate(week.endDate);
    weekSubtitle.textContent = `${startDate} - ${endDate}`;
}

function updateStatistics(stats) {
    document.getElementById('total-reservations').textContent = stats.totalReservations;
    document.getElementById('active-reservations').textContent = stats.activeReservations;
    document.getElementById('occupancy-rate').textContent = `${stats.occupancyRate}%`;
}

function renderReservationsByDay(reservationsByDay) {
    const container = document.getElementById('reservations-container');
    container.innerHTML = '';
    
    // Convert object to array and sort by date
    const days = Object.keys(reservationsByDay)
        .map(date => ({ date, ...reservationsByDay[date] }))
        .sort((a, b) => a.date.localeCompare(b.date));
    
    days.forEach(day => {
        const daySection = document.createElement('div');
        daySection.className = 'day-section';
        
        const hasReservations = day.reservations.length > 0;
        const activeReservations = day.reservations.filter(r => r.status === 'active');
        
        daySection.innerHTML = `
            <div class="day-header">
                <div class="day-title">
                    ${day.dayInfo.dayName}, ${day.dayInfo.dayNumber} ${day.dayInfo.month}
                    ${day.dayInfo.isToday ? '<span style="color: #48bb78; font-size: 0.9rem;">(Sot)</span>' : ''}
                </div>
                <div class="day-count ${hasReservations ? '' : 'empty'}">
                    ${activeReservations.length} rezervime
                </div>
            </div>
            <div class="reservations-list">
                ${hasReservations ? renderDayReservations(day.reservations) : renderEmptyDay()}
            </div>
        `;
        
        container.appendChild(daySection);
    });
    
    // Setup cancel button event listeners after DOM is updated
    setupCancelButtonListeners();
}

function renderDayReservations(reservations) {
    return reservations.map(reservation => `
        <div class="reservation-item">
            <div class="reservation-info">
                <div class="reservation-time">${reservation.display}</div>
                <div class="reservation-name">${reservation.name}</div>
                <div class="reservation-code">Kodi: ${reservation.code}</div>
            </div>
            <div class="reservation-actions">
                ${reservation.status === 'active' ? `
                    <button class="btn-small danger admin-cancel-btn" 
                            data-code="${reservation.code}" 
                            data-name="${reservation.name}" 
                            data-display="${reservation.display}"
                            title="Anulo rezervimin">
                        ❌
                    </button>
                ` : `
                    <span style="color: #a0aec0; font-size: 0.8rem;">Anuluar</span>
                `}
            </div>
        </div>
    `).join('');
}

function renderEmptyDay() {
    return `
        <div class="empty-day">
            <div class="empty-day-icon">😴</div>
            <div>Asnjë rezervim për këtë ditë</div>
        </div>
    `;
}

function setupCancelButtonListeners() {
    // Remove existing listeners to prevent duplicates
    const existingButtons = document.querySelectorAll('.admin-cancel-btn');
    existingButtons.forEach(button => {
        button.removeEventListener('click', handleCancelClick);
        button.addEventListener('click', handleCancelClick);
    });
}

function handleCancelClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const code = this.getAttribute('data-code');
    const name = this.getAttribute('data-name');
    const display = this.getAttribute('data-display');
    
    console.log('Cancel button clicked:', { code, name, display });
    showAdminCancelModal(code, name, display);
}

function showAdminCancelModal(code, name, time) {
    console.log('showAdminCancelModal called with:', { code, name, time });
    selectedReservationForCancel = { code, name, time };
    
    // Update modal content
    const cancelInfo = document.getElementById('admin-cancel-info');
    if (cancelInfo) {
        cancelInfo.textContent = `${name} - ${time}`;
        console.log('Updated modal content');
    }
    
    // Clear any previous messages
    const messageEl = document.getElementById('admin-cancel-message');
    if (messageEl) {
        messageEl.style.display = 'none';
    }
    
    // Show modal immediately without animation issues
    const modal = document.getElementById('admin-cancel-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.classList.add('active');
        
        // Attach event listeners immediately
        const closeBtn = document.getElementById('admin-modal-close');
        if (closeBtn) {
            closeBtn.onclick = function(e) {
                e.preventDefault();
                console.log('Admin close button clicked');
                closeAdminCancelModal();
            };
        }
        
        const cancelBtn = document.getElementById('cancel-cancel-btn');
        if (cancelBtn) {
            cancelBtn.onclick = function(e) {
                e.preventDefault();
                console.log('Admin cancel button clicked');
                closeAdminCancelModal();
            };
        }
        
        const confirmBtn = document.getElementById('admin-confirm-cancel');
        if (confirmBtn) {
            confirmBtn.onclick = function(e) {
                e.preventDefault();
                console.log('Admin confirm button clicked');
                confirmAdminCancel();
            };
        }
    }
}

// Make functions globally available for onclick handlers
window.closeAdminCancelModal = closeAdminCancelModal;
window.confirmAdminCancel = confirmAdminCancel;
window.logout = logout;

function attachModalButtonListeners() {
    const modal = document.getElementById('admin-cancel-modal');
    
    // Close button
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.onclick = closeAdminCancelModal;
    }
    
    // Cancel button (Mbaj)
    const cancelBtn = modal.querySelector('.btn-secondary');
    if (cancelBtn) {
        cancelBtn.onclick = closeAdminCancelModal;
    }
    
    // Confirm button (Anulo Rezervimin)
    const confirmBtn = document.getElementById('admin-confirm-cancel');
    if (confirmBtn) {
        confirmBtn.onclick = confirmAdminCancel;
    }
}

function closeAdminCancelModal() {
    console.log('closeAdminCancelModal called');
    const modal = document.getElementById('admin-cancel-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        selectedReservationForCancel = null;
        const messageEl = document.getElementById('admin-cancel-message');
        if (messageEl) {
            messageEl.style.display = 'none';
        }
    }
}

async function confirmAdminCancel() {
    console.log('confirmAdminCancel called');
    if (!selectedReservationForCancel) {
        console.error('No reservation selected for cancellation');
        return;
    }
    
    const confirmBtn = document.getElementById('admin-confirm-cancel');
    if (!confirmBtn) {
        console.error('Confirm button not found');
        return;
    }
    
    const originalText = confirmBtn.innerHTML;
    
    // Show loading
    confirmBtn.innerHTML = '<div class="spinner"></div> Duke anuluar...';
    confirmBtn.disabled = true;
    
    try {
        const response = await App.apiRequest('/api/admin/anulo-rezervim', {
            method: 'POST',
            body: JSON.stringify({
                reservationCode: selectedReservationForCancel.code
            })
        });
        
        if (response.success) {
            showAdminCancelMessage('Rezervimi u anulua me sukses.', 'success');
            
            // Reload reservations after a short delay
            setTimeout(async () => {
                await loadReservations();
                closeAdminCancelModal();
            }, 1500);
        } else {
            showAdminCancelMessage(response.error, 'error');
        }
        
    } catch (error) {
        console.error('Admin cancel failed:', error);
        showAdminCancelMessage('Ka ndodhur një gabim gjatë anulimit. Ju lutem provoni përsëri.', 'error');
    } finally {
        // Reset button
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

function showAdminCancelMessage(message, type = 'info') {
    const messageContainer = document.getElementById('admin-cancel-message');
    messageContainer.className = `admin-cancel-message ${type}`;
    messageContainer.textContent = message;
    messageContainer.style.display = 'block';
}

async function logout() {
    try {
        // Call logout endpoint
        await App.apiRequest('/api/admin/dil', {
            method: 'POST'
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Reset state regardless of API call result
        isLoggedIn = false;
        adminData = null;
        reservationsData = null;
        selectedReservationForCancel = null;
        
        // Reset form
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('login-message').style.display = 'none';
        
        // Hide dashboard and show login
        document.getElementById('dashboard-section').style.display = 'none';
        document.getElementById('loading-dashboard').style.display = 'none';
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('back-btn').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'none';
        
        // Focus on username field
        setTimeout(() => {
            document.getElementById('username').focus();
        }, 300);
    }
}