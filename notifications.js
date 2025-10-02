// notifications.js - Enhanced Notification System
class AppNotifications {
    constructor() {
        this.notificationContainer = null;
        this.notificationQueue = [];
        this.isShowing = false;
        this.init();
    }

    init() {
        this.createNotificationContainer();
        this.setupNotificationListeners();
        this.processQueue();
    }

    createNotificationContainer() {
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'app-notifications';
        this.notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            max-width: 400px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        document.body.appendChild(this.notificationContainer);
    }

    showNotification(title, message, type = 'info', duration = 5000, actions = []) {
        const notification = {
            id: 'notif_' + Date.now() + Math.random().toString(36).substr(2, 9),
            title,
            message,
            type,
            duration,
            actions,
            timestamp: Date.now()
        };

        this.notificationQueue.push(notification);
        this.processQueue();
        
        return notification.id;
    }

    processQueue() {
        if (this.isShowing || this.notificationQueue.length === 0) return;

        this.isShowing = true;
        const notification = this.notificationQueue.shift();
        this.displayNotification(notification);
    }

    displayNotification(notification) {
        const notificationEl = document.createElement('div');
        notificationEl.id = notification.id;
        notificationEl.className = `notification notification-${notification.type}`;
        notificationEl.style.cssText = `
            background: ${this.getBackgroundColor(notification.type)};
            color: white;
            padding: 16px;
            margin-bottom: 10px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            animation: slideInRight 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            cursor: pointer;
            border-left: 4px solid ${this.getBorderColor(notification.type)};
            max-width: 380px;
            word-wrap: break-word;
        `;

        const icon = this.getIcon(notification.type);
        
        notificationEl.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="font-size: 20px; flex-shrink: 0;">${icon}</div>
                <div style="flex: 1; min-width: 0;">
                    <strong style="display: block; margin-bottom: 4px; font-size: 14px;">${this.escapeHtml(notification.title)}</strong>
                    <div style="font-size: 13px; line-height: 1.4; opacity: 0.9;">${this.escapeHtml(notification.message)}</div>
                    ${notification.actions.length > 0 ? `
                        <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
                            ${notification.actions.map(action => `
                                <button onclick="event.stopPropagation(); appNotifications.handleAction('${notification.id}', '${action.id}')" 
                                        style="padding: 4px 8px; background: rgba(255,255,255,0.2); border: none; border-radius: 4px; color: white; font-size: 12px; cursor: pointer;">
                                    ${this.escapeHtml(action.text)}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                <button onclick="event.stopPropagation(); appNotifications.removeNotification('${notification.id}')" 
                        style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 0; margin: -4px -4px 0 0; opacity: 0.7;">
                    ×
                </button>
            </div>
            <div style="height: 3px; background: rgba(255,255,255,0.3); border-radius: 2px; margin-top: 12px; overflow: hidden;">
                <div id="progress-${notification.id}" style="height: 100%; background: white; width: 100%; transition: width ${notification.duration}ms linear;"></div>
            </div>
        `;

        notificationEl.onclick = () => this.removeNotification(notification.id);
        this.notificationContainer.appendChild(notificationEl);

        // Start progress bar
        setTimeout(() => {
            const progressBar = document.getElementById(`progress-${notification.id}`);
            if (progressBar) {
                progressBar.style.width = '0%';
            }
        }, 50);

        // Auto remove
        if (notification.duration > 0) {
            setTimeout(() => this.removeNotification(notification.id), notification.duration);
        }
    }

    removeNotification(notificationId) {
        const notificationEl = document.getElementById(notificationId);
        if (notificationEl) {
            notificationEl.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notificationEl.parentElement) {
                    notificationEl.remove();
                }
                this.isShowing = false;
                this.processQueue();
            }, 300);
        }
    }

    handleAction(notificationId, actionId) {
        document.dispatchEvent(new CustomEvent('notification-action', {
            detail: { notificationId, actionId }
        }));
        this.removeNotification(notificationId);
    }

    getBackgroundColor(type) {
        const colors = {
            info: '#8B0000',      // Your brand red
            success: '#28a745',   // Green
            warning: '#ffc107',   // Yellow
            error: '#dc3545',     // Red
            system: '#6f42c1'     // Purple for system messages
        };
        return colors[type] || colors.info;
    }

    getBorderColor(type) {
        const colors = {
            info: '#5a0000',
            success: '#1e7e34',
            warning: '#e0a800',
            error: '#c82333',
            system: '#5a36a3'
        };
        return colors[type] || colors.info;
    }

    getIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            system: '🔔'
        };
        return icons[type] || icons.info;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupNotificationListeners() {
        // Listen for custom events from other parts of the app
        document.addEventListener('app-notification', (event) => {
            const { title, message, type, duration, actions } = event.detail;
            this.showNotification(title, message, type, duration, actions);
        });

        // Listen for push notifications
        document.addEventListener('push-notification', (event) => {
            const { title, options } = event.detail;
            this.showPushNotification(title, options);
        });
    }

    // Predefined notification templates
    static profileUpdated(name = '') {
        document.dispatchEvent(new CustomEvent('app-notification', {
            detail: {
                title: '✅ Profile Updated',
                message: name ? `Profile for ${name} has been updated successfully` : 'Your profile has been updated successfully',
                type: 'success',
                duration: 3000
            }
        }));
    }

    static loginSuccess(userName) {
        document.dispatchEvent(new CustomEvent('app-notification', {
            detail: {
                title: '👋 Welcome Back!',
                message: `Hello ${userName}! Ready to make some beautiful music?`,
                type: 'success',
                duration: 4000
            }
        }));
    }

    static newEventAdded(eventTitle) {
        document.dispatchEvent(new CustomEvent('app-notification', {
            detail: {
                title: '📅 New Event Scheduled',
                message: `"${eventTitle}" has been added to the calendar`,
                type: 'info',
                duration: 5000,
                actions: [
                    { id: 'view_calendar', text: 'View Calendar' },
                    { id: 'dismiss', text: 'Dismiss' }
                ]
            }
        }));
    }

    static songAdded(songTitle) {
        document.dispatchEvent(new CustomEvent('app-notification', {
            detail: {
                title: '🎵 Song Added to Repertoire',
                message: `"${songTitle}" has been added to our music collection`,
                type: 'success',
                duration: 4000
            }
        }));
    }

    static suggestionSubmitted(title) {
        document.dispatchEvent(new CustomEvent('app-notification', {
            detail: {
                title: '💡 Suggestion Received',
                message: `"${title}" has been submitted for review`,
                type: 'info',
                duration: 4000
            }
        }));
    }

    static leaderApproved(role) {
        document.dispatchEvent(new CustomEvent('app-notification', {
            detail: {
                title: '👑 Leadership Approved',
                message: `You have been approved as ${role}`,
                type: 'success',
                duration: 5000
            }
        }));
    }

    static securityAlert(message) {
        document.dispatchEvent(new CustomEvent('app-notification', {
            detail: {
                title: '🛡️ Security Notice',
                message: message,
                type: 'warning',
                duration: 6000
            }
        }));
    }

    static systemMaintenance(message) {
        document.dispatchEvent(new CustomEvent('app-notification', {
            detail: {
                title: '🔧 System Update',
                message: message,
                type: 'system',
                duration: 8000
            }
        }));
    }
}

// Enhanced Push Notifications with Service Worker integration
class PushNotifications {
    constructor() {
        this.isSupported = 'Notification' in window;
        this.permission = this.isSupported ? Notification.permission : 'denied';
        this.serviceWorkerRegistration = null;
        this.init();
    }

    async init() {
        if ('serviceWorker' in navigator) {
            try {
                this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
                console.log('✅ Push Notifications: Service Worker ready');
            } catch (error) {
                console.error('❌ Push Notifications: Service Worker failed', error);
            }
        }
    }

    async requestPermission() {
        if (!this.isSupported) {
            console.warn('⚠️ Push Notifications not supported');
            return false;
        }
        
        if (this.permission === 'default') {
            try {
                this.permission = await Notification.requestPermission();
                
                if (this.permission === 'granted') {
                    this.subscribeToPush();
                }
            } catch (error) {
                console.error('❌ Error requesting notification permission:', error);
            }
        }
        
        return this.permission === 'granted';
    }

    async subscribeToPush() {
        if (!this.serviceWorkerRegistration) return;

        try {
            const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array('BEl62iUYbU3oQ6dBs3oQ6dBs3oQ6dBs3oQ6dBs3oQ6dBs3oQ6dBs3oQ6dBs3oQ6dBs3oQ6dBs3oQ6dBs3o')
            });
            
            console.log('✅ Push subscription successful:', subscription);
            return subscription;
        } catch (error) {
            console.error('❌ Push subscription failed:', error);
            return null;
        }
    }

    showPushNotification(title, options = {}) {
        if (!this.isSupported || this.permission !== 'granted') {
            // Fallback to in-app notifications
            appNotifications.showNotification(title, options.body || '', 'system', 6000);
            return null;
        }

        const notification = new Notification(title, {
            icon: '/images/1000095305.jpg',
            badge: '/images/1000095305.jpg',
            tag: 'emmanuel-royal-band',
            requireInteraction: options.important || false,
            ...options
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
            
            // Handle notification click actions
            if (options.data && options.data.action) {
                document.dispatchEvent(new CustomEvent('push-notification-click', {
                    detail: options.data
                }));
            }
        };

        return notification;
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Schedule recurring notifications
    scheduleRehearsalReminder() {
        if (!this.isSupported) return;

        // Schedule for Thursdays and Saturdays at 4:30 PM (30 minutes before practice)
        const now = new Date();
        const nextThursday = new Date(now);
        nextThursday.setDate(now.getDate() + ((4 + 7 - now.getDay()) % 7));
        nextThursday.setHours(16, 30, 0, 0);

        const nextSaturday = new Date(now);
        nextSaturday.setDate(now.getDate() + ((6 + 7 - now.getDay()) % 7));
        nextSaturday.setHours(16, 30, 0, 0);

        if (nextThursday > now) {
            setTimeout(() => {
                this.showPushNotification('🎵 Band Practice Reminder', {
                    body: 'Band practice starts in 30 minutes!',
                    important: true
                });
            }, nextThursday - now);
        }

        if (nextSaturday > now) {
            setTimeout(() => {
                this.showPushNotification('🎵 Band Practice Reminder', {
                    body: 'Band practice starts in 30 minutes!',
                    important: true
                });
            }, nextSaturday - now);
        }
    }
}

// Initialize notifications globally
const appNotifications = new AppNotifications();
const pushNotifications = new PushNotifications();

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification {
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.1);
    }
    
    .notification:hover {
        transform: translateY(-2px);
        transition: transform 0.2s ease;
    }
    
    @media (max-width: 768px) {
        #app-notifications {
            top: 10px;
            right: 10px;
            left: 10px;
            max-width: none;
        }
    }
`;
document.head.appendChild(style);

// Export for use in other modules
window.AppNotifications = AppNotifications;
window.PushNotifications = PushNotifications;
window.appNotifications = appNotifications;
window.pushNotifications = pushNotifications;
