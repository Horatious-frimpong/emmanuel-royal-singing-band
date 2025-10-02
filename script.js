// script.js - Enhanced Global Utilities with Security
(function() {
    'use strict';

    // ✅ HTTPS enforcement and security headers
    if (window.location.protocol === 'http:' && 
        window.location.hostname !== 'localhost' && 
        !window.location.hostname.includes('127.0.0.1')) {
        window.location.href = window.location.href.replace('http:', 'https:');
    }

    // ✅ Content Security Policy violation reporting
    document.addEventListener('securitypolicyviolation', (e) => {
        console.error('🚨 CSP Violation:', {
            violatedDirective: e.violatedDirective,
            blockedURI: e.blockedURI,
            originalPolicy: e.originalPolicy
        });
        
        SecurityUtils.logSecurityEvent('CSP_VIOLATION', {
            violatedDirective: e.violatedDirective,
            blockedURI: e.blockedURI,
            userAgent: navigator.userAgent
        });
    });

    // ✅ Enhanced Session Manager with security features
    class SecureSessionManager {
        constructor() {
            this.timeout = 20 * 60 * 1000; // 20 minutes
            this.warningTime = 5 * 60 * 1000; // 5 minute warning
            this.timer = null;
            this.warningTimer = null;
            this.init();
        }

        init() {
            this.resetTimer();
            this.setupEventListeners();
            this.setupVisibilityListener();
            this.setupInactivityMonitoring();
        }

        resetTimer() {
            if (this.timer) clearTimeout(this.timer);
            if (this.warningTimer) clearTimeout(this.warningTimer);
            
            this.timer = setTimeout(() => this.handleTimeout(), this.timeout);
            this.warningTimer = setTimeout(() => this.showTimeoutWarning(), this.timeout - this.warningTime);
        }

        setupEventListeners() {
            const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'touchmove'];
            
            events.forEach(event => {
                document.addEventListener(event, () => {
                    this.resetTimer();
                }, { passive: true });
            });

            // Prevent multiple tabs from causing conflicts
            window.addEventListener('storage', (e) => {
                if (e.key === 'session_activity' && e.newValue) {
                    this.resetTimer();
                }
            });
        }

        setupVisibilityListener() {
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.resetTimer();
                }
            });
        }

        setupInactivityMonitoring() {
            // Log unusual inactivity patterns
            setInterval(() => {
                this.checkActivityPatterns();
            }, 60000); // Check every minute
        }

        async checkActivityPatterns() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // In a real application, this would send activity data to your server
            const activity = {
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            };

            // Store locally for debugging
            const activities = JSON.parse(localStorage.getItem('user_activities') || '[]');
            activities.push(activity);
            
            if (activities.length > 100) {
                activities.shift();
            }
            
            localStorage.setItem('user_activities', JSON.stringify(activities));
        }

        async handleTimeout() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await this.performSecureLogout();
            }
        }

        async showTimeoutWarning() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Check if warning is already shown
            if (document.getElementById('session-warning-modal')) return;

            const warning = document.createElement('div');
            warning.id = 'session-warning-modal';
            warning.style.cssText = `
                position: fixed; 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -50%);
                background: white; 
                padding: 2rem; 
                border-radius: 12px; 
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                z-index: 10000; 
                border: 3px solid #8B0000; 
                text-align: center;
                max-width: 400px;
                width: 90%;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            `;
            
            warning.innerHTML = `
                <div style="font-size: 3rem; margin-bottom: 1rem;">⏰</div>
                <h3 style="color: #8B0000; margin-bottom: 1rem;">Session About to Expire</h3>
                <p style="margin-bottom: 1.5rem; line-height: 1.5;">
                    Your session will expire in 5 minutes due to inactivity. 
                    Would you like to stay logged in?
                </p>
                <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                    <button id="extendSession" style="background: #8B0000; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
                        Stay Logged In
                    </button>
                    <button id="logoutSession" style="background: #6c757d; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
                        Logout Now
                    </button>
                </div>
                <div style="margin-top: 1rem; font-size: 12px; color: #666;">
                    For your security, sessions automatically expire after 20 minutes of inactivity.
                </div>
            `;

            document.body.appendChild(warning);

            // Add overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 9999;
            `;
            document.body.appendChild(overlay);

            document.getElementById('extendSession').onclick = () => {
                document.body.removeChild(warning);
                document.body.removeChild(overlay);
                this.resetTimer();
                AppNotifications.showNotification(
                    'Session Extended', 
                    'Your session has been extended.',
                    'success',
                    3000
                );
            };

            document.getElementById('logoutSession').onclick = async () => {
                document.body.removeChild(warning);
                document.body.removeChild(overlay);
                await this.performSecureLogout();
            };

            // Auto-remove overlay when clicking outside
            overlay.onclick = () => {
                document.body.removeChild(warning);
                document.body.removeChild(overlay);
                this.resetTimer();
            };
        }

        async performSecureLogout() {
            try {
                // Clear all timers
                if (this.timer) clearTimeout(this.timer);
                if (this.warningTimer) clearTimeout(this.warningTimer);

                // Show logout notification
                AppNotifications.showNotification(
                    'Session Expired', 
                    'You have been logged out for security.',
                    'info',
                    4000
                );

                // Perform logout
                await supabase.auth.signOut();
                
                // Clear sensitive data
                localStorage.removeItem('session_activity');
                sessionStorage.clear();
                
                // Redirect to login
                setTimeout(() => {
                    window.location.href = 'members.html';
                }, 1000);

            } catch (error) {
                console.error('Logout error:', error);
                window.location.href = 'members.html';
            }
        }
    }

    // ✅ Enhanced Mobile Navigation with security
    function setupSecureMobileNav() {
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (navToggle && navMenu) {
            // Prevent multiple event listeners
            navToggle.replaceWith(navToggle.cloneNode(true));
            const newNavToggle = document.querySelector('.nav-toggle');
            
            newNavToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                navMenu.classList.toggle('active');
                
                // Log menu interactions for security monitoring
                SecurityUtils.logSecurityEvent('NAVIGATION', {
                    action: 'mobile_menu_toggle',
                    state: navMenu.classList.contains('active') ? 'opened' : 'closed'
                });
            });
            
            // Close menu when clicking outside (with security check)
            document.addEventListener('click', (e) => {
                if (navMenu.classList.contains('active') && 
                    !navMenu.contains(e.target) && 
                    !newNavToggle.contains(e.target)) {
                    navMenu.classList.remove('active');
                }
            }, { passive: true });
            
            // Prevent right-click context menu on sensitive elements
            navMenu.addEventListener('contextmenu', (e) => {
                if (e.target.closest('.admin-only')) {
                    e.preventDefault();
                    AppNotifications.showNotification(
                        'Security Notice',
                        'Right-click is disabled on this element for security.',
                        'warning',
                        3000
                    );
                }
            });
        }
    }

    // ✅ Enhanced Loading States with security
    function showLoadingState(element, message = 'Loading...') {
        if (!element) return;
        
        const originalContent = element.innerHTML;
        const originalCursor = element.style.cursor;
        
        element.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 1rem;">
                <div class="loading-spinner" style="
                    width: 20px; 
                    height: 20px; 
                    border: 2px solid #f3f3f3; 
                    border-top: 2px solid #8B0000; 
                    border-radius: 50%; 
                    animation: spin 1s linear infinite;
                "></div>
                <span>${SecurityUtils.preventXSS(message)}</span>
            </div>
        `;
        element.style.cursor = 'wait';
        element.disabled = true;
        
        return () => {
            element.innerHTML = originalContent;
            element.style.cursor = originalCursor;
            element.disabled = false;
        };
    }

    // ✅ Enhanced Error Handler with security logging
    function handleError(error, context = 'Unknown') {
        console.error(`❌ Error in ${context}:`, error);
        
        // Sanitize error message for display
        const safeMessage = SecurityUtils.sanitizeInput(
            error.message || 'An unexpected error occurred'
        );
        
        // Log security event
        SecurityUtils.logSecurityEvent('ERROR', {
            context,
            message: safeMessage,
            stack: error.stack ? error.stack.substring(0, 500) : 'No stack',
            timestamp: new Date().toISOString()
        });
        
        // Show user-friendly notification
        AppNotifications.showNotification(
            'Error Occurred',
            safeMessage,
            'error',
            6000
        );
        
        // In production, send to error tracking service
        if (window.location.hostname !== 'localhost') {
            // This would be a call to your error tracking service
            console.log('📡 Error would be sent to tracking service:', { context, message: safeMessage });
        }
    }

    // ✅ Enhanced Form Handler with security validation
    function setupSecureForm(formSelector, onSubmit) {
        const form = document.querySelector(formSelector);
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validate CSRF token
            const csrfToken = form.querySelector('input[name="csrf_token"]')?.value;
            if (!csrfToken || !SecurityUtils.validateCSRFToken(csrfToken)) {
                AppNotifications.showNotification(
                    'Security Error',
                    'Invalid form submission. Please refresh the page and try again.',
                    'error',
                    5000
                );
                return;
            }
            
            // Check for suspicious activity
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            if (SecurityUtils.detectSuspiciousActivity('form_submission', data)) {
                AppNotifications.showNotification(
                    'Security Blocked',
                    'Suspicious activity detected. Submission blocked.',
                    'error',
                    5000
                );
                return;
            }
            
            // Sanitize all input data
            const sanitizedData = {};
            for (const [key, value] of Object.entries(data)) {
                sanitizedData[key] = SecurityUtils.sanitizeInput(value.toString());
            }
            
            // Show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            const restoreButton = showLoadingState(submitButton, 'Processing...');
            
            try {
                await onSubmit(sanitizedData, form);
            } catch (error) {
                handleError(error, 'Form submission');
            } finally {
                if (restoreButton) restoreButton();
            }
        });
        
        // Add input validation
        form.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('blur', (e) => {
                validateInput(e.target);
            });
            
            input.addEventListener('input', (e) => {
                clearValidationState(e.target);
            });
        });
        
        function validateInput(input) {
            const value = input.value.trim();
            let isValid = true;
            let message = '';
            
            switch (input.type) {
                case 'email':
                    isValid = SecurityUtils.validateEmail(value);
                    message = isValid ? '' : 'Please enter a valid email address';
                    break;
                    
                case 'tel':
                    isValid = !value || SecurityUtils.validatePhone(value);
                    message = isValid ? '' : 'Please enter a valid phone number';
                    break;
                    
                case 'password':
                    if (value && input.hasAttribute('data-validate-password')) {
                        const validation = SecurityUtils.validatePassword(value);
                        isValid = validation.isValid;
                        message = isValid ? '' : 'Password does not meet requirements';
                    }
                    break;
                    
                case 'text':
                case 'textarea':
                    if (input.hasAttribute('data-required') && !value) {
                        isValid = false;
                        message = 'This field is required';
                    } else if (input.hasAttribute('maxlength')) {
                        const maxLength = parseInt(input.getAttribute('maxlength'));
                        isValid = value.length <= maxLength;
                        message = isValid ? '' : `Maximum ${maxLength} characters allowed`;
                    }
                    break;
            }
            
            setValidationState(input, isValid, message);
            return isValid;
        }
        
        function setValidationState(input, isValid, message) {
            input.style.borderColor = isValid ? '#28a745' : '#dc3545';
            
            // Remove existing message
            const existingMessage = input.parentNode.querySelector('.validation-message');
            if (existingMessage) {
                existingMessage.remove();
            }
            
            if (message) {
                const messageEl = document.createElement('div');
                messageEl.className = 'validation-message';
                messageEl.style.cssText = `
                    color: #dc3545;
                    font-size: 12px;
                    margin-top: 4px;
                `;
                messageEl.textContent = message;
                input.parentNode.appendChild(messageEl);
            }
        }
        
        function clearValidationState(input) {
            input.style.borderColor = '';
            const message = input.parentNode.querySelector('.validation-message');
            if (message) {
                message.remove();
            }
        }
    }

    // ✅ Enhanced Image Handler with security
    function handleImageUpload(file, onSuccess, onError) {
        if (!file) return;
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            onError?.('Only JPG, PNG, and GIF images are allowed');
            return;
        }
        
        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            onError?.('Image size must be less than 5MB');
            return;
        }
        
        // Create secure file name
        const secureFileName = SecurityUtils.sanitizeFilename(file.name);
        
        // Create image preview with security checks
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Additional security checks
                if (img.width > 5000 || img.height > 5000) {
                    onError?.('Image dimensions too large');
                    return;
                }
                
                onSuccess?.(e.target.result, secureFileName);
            };
            
            img.onerror = () => {
                onError?.('Invalid image file');
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            onError?.('Error reading file');
        };
        
        reader.readAsDataURL(file);
    }

    // ✅ Initialize all security features
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize session manager
        const sessionManager = new SecureSessionManager();
        
        // Setup mobile navigation
        setupSecureMobileNav();
        
        // Add security CSS
        const securityStyles = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .secure-element {
                position: relative;
            }
            
            .secure-element::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 1;
            }
            
            /* Prevent text selection on sensitive data */
            .no-select {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }
            
            /* Hide sensitive data when printing */
            @media print {
                .no-print, .sensitive-data {
                    display: none !important;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = securityStyles;
        document.head.appendChild(styleSheet);
        
        // Log page view for security monitoring
        SecurityUtils.logSecurityEvent('PAGE_VIEW', {
            url: window.location.href,
            referrer: document.referrer,
            timestamp: new Date().toISOString()
        });
        
        console.log('🔒 Security features initialized successfully');
    });

    // ✅ Export utilities globally
    window.SecureSessionManager = SecureSessionManager;
    window.setupSecureForm = setupSecureForm;
    window.handleImageUpload = handleImageUpload;
    window.handleError = handleError;
    window.showLoadingState = showLoadingState;

})();
