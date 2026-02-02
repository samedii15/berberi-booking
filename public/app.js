// Utility functions and global state
const App = {
    currentWeek: null,
    selectedDay: null,
    selectedSlot: null,
    
    // Albanian month names
    months: [
        'Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor',
        'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'
    ],
    
    // Albanian day names
    dayNames: {
        'Monday': 'E Hënë',
        'Tuesday': 'E Martë', 
        'Wednesday': 'E Mërkurë',
        'Thursday': 'E Enjte',
        'Friday': 'E Premte',
        'Saturday': 'E Shtunë',
        'Sunday': 'E Diel'
    },

    // Format date in Albanian
    formatDate(date) {
        const d = new Date(date);
        const day = d.getDate();
        const month = this.months[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
    },

    // Get day name in Albanian
    getDayName(date) {
        const d = new Date(date);
        const englishDay = d.toLocaleDateString('en-US', { weekday: 'long' });
        return this.dayNames[englishDay] || englishDay;
    },

    // Show message
    showMessage(container, message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        
        // Remove existing messages
        const existingMessages = container.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
        
        // Add new message
        container.insertBefore(messageEl, container.firstChild);
        
        // Auto remove after 5 seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 5000);
        }
    },

    // Make API request
    async apiRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    },

    // Copy text to clipboard
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return false;
        }
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Berberi App loaded successfully');
    
    // Add global event listeners if needed
    document.addEventListener('click', function(e) {
        // Close modals when clicking outside
        if (e.target.classList.contains('modal')) {
            const modal = e.target;
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    });
    
    // Handle keyboard events
    document.addEventListener('keydown', function(e) {
        // Close modals on Escape
        if (e.key === 'Escape') {
            const activeModals = document.querySelectorAll('.modal.active');
            activeModals.forEach(modal => {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            });
        }
    });
});