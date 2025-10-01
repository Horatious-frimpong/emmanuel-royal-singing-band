// notifications.js - Simple in-app notification system
class AppNotifications {
    constructor() {
        this.notificationContainer = null;
        this.init();
    }

    init() {
        this.createNotificationContainer();
        this.setupNotificationListeners();
    }

    createNotificationContainer() {
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'app-notifications';
        this.notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            max-width: 350px;
        `;
        document.body.appendChild(this.notificationContainer);
    }

    showNotification(title, message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${this.getBackgroundColor(type)};
            color: white;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            animation: slideInRight 0.3s ease-out;
            cursor: pointer;
        `;

        notification.innerHTML = `
            <strong>${title}</strong>
            <div style="margin-top: 5px; font-size: 14px;">${message}</div>
        `;

        notification.onclick = () => this.removeNotification(notification);

        this.notificationContainer.appendChild(notification);

        if (duration > 0) {
            setTimeout(() => this.removeNotification(notification), duration);
        }

        return notification;
    }

    removeNotification(notification) {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }

    getBackgroundColor(type) {
        const colors = {
            info: '#8B0000',
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545'
        };
        return colors[type] || colors.info;
    }

    setupNotificationListeners() {
        // Listen for custom events from other parts of the app
        document.addEventListener('app-notification', (event) => {
            const { title, message, type, duration } = event.detail;
            this.showNotification(title, message, type, duration);
        });
    }

    // Helper methods for common notifications
    static profileUpdated() {
        document.dispatchEvent(new CustomEvent('app-notification', {
            detail: {
                title: '✅ Profile Updated',
                message: 'Your profile has been updated successfully',
                type: 'success',
                duration: 3000
            }
        }));
    }

    static loginSuccess(userName) {
        document.dispatchEvent(new CustomEvent('app-notification', {
            detail: {
                title: '👋 Welcome Back!',
                message: `Hello ${userName}`,
                type: 'success',
                duration: 3000
            }
        }));
    }

    static newEventAdded(eventTitle) {
        document.dispatchEvent(new CustomEvent('app-notification', {
            detail: {
                title: '📅 New Event',
                message: `"${eventTitle}" has been added to the calendar`,
                type: 'info',
                duration: 5000
            }
        }));
    }

    static songAdded(songTitle) {
        document.dispatchEvent(new CustomEvent('app-notification', {
            detail: {
                title: '🎵 Song Added',
                message: `"${songTitle}" has been added to the repertoire`,
                type: 'success',
                duration: 4000
            }
        }));
    }
}// Add this to notifications.js - BROWSER PUSH NOTIFICATIONS
class PushNotifications {
    constructor() {
        this.isSupported = 'Notification' in window;
        this.permission = this.isSupported ? Notification.permission : 'denied';
    }

    async requestPermission() {
        if (!this.isSupported) return false;
        
        if (this.permission === 'default') {
            this.permission = await Notification.requestPermission();
        }
        
        return this.permission === 'granted';
    }

    showPushNotification(title, options = {}) {
        if (!this.isSupported || this.permission !== 'granted') return null;

        const notification = new Notification(title, {
            icon: '/images/1000095305.jpg', // Your band logo
            badge: '/images/1000095305.jpg',
            ...options
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        return notification;
    }
}


// Initialize notifications
const appNotifications = new AppNotifications();
const pushNotifications = new PushNotifications();
