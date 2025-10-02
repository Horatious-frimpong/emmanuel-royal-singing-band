// security-utils.js - Enhanced Security Utilities
class SecurityUtils {
    static sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        
        // Remove null bytes and other dangerous characters
        let sanitized = input
            .replace(/\0/g, '')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .replace(/\\/g, '&#x5C;')
            .replace(/\n/g, '<br>')
            .replace(/\r/g, '')
            .trim();
            
        // Limit length to prevent DoS attacks
        if (sanitized.length > 10000) {
            sanitized = sanitized.substring(0, 10000);
            console.warn('Input truncated for security');
        }
        
        return sanitized;
    }

    static validateEmail(email) {
        if (typeof email !== 'string') return false;
        
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        const isValid = emailRegex.test(email) && email.length <= 254;
        
        if (!isValid) {
            console.warn('Invalid email format attempted:', email);
        }
        
        return isValid;
    }

    static validatePhone(phone) {
        if (typeof phone !== 'string') return false;
        
        // International phone number validation
        const phoneRegex = /^\+?[\d\s-()]{10,20}$/;
        const isValid = phoneRegex.test(phone);
        
        if (!isValid) {
            console.warn('Invalid phone number format attempted:', phone);
        }
        
        return isValid;
    }

    static preventXSS(text) {
        if (typeof text !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static sanitizeFilename(filename) {
        if (typeof filename !== 'string') return 'file';
        
        // Remove path traversal attempts and special characters
        let sanitized = filename
            .replace(/\.\.\//g, '')
            .replace(/\.\.\\/g, '')
            .replace(/^.*[\\\/]/, '')
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .toLowerCase();
            
        // Ensure it has a safe extension
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'];
        const hasAllowedExtension = allowedExtensions.some(ext => sanitized.endsWith(ext));
        
        if (!hasAllowedExtension) {
            sanitized += '.jpg'; // Default to jpg for images
        }
        
        return sanitized.substring(0, 255); // Limit filename length
    }

    static validatePassword(password) {
        if (typeof password !== 'string') return false;
        
        const requirements = {
            minLength: 8,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumbers: /\d/.test(password),
            hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        
        const isValid = password.length >= requirements.minLength &&
                       requirements.hasUpperCase &&
                       requirements.hasLowerCase &&
                       requirements.hasNumbers;
        
        if (!isValid) {
            console.warn('Weak password attempted');
        }
        
        return {
            isValid,
            requirements,
            strength: this.calculatePasswordStrength(password)
        };
    }

    static calculatePasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
        
        if (strength <= 2) return 'Weak';
        if (strength <= 4) return 'Medium';
        return 'Strong';
    }

    static generateCSRFToken() {
        const token = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
        
        // Store in session storage
        sessionStorage.setItem('csrf_token', token);
        return token;
    }

    static validateCSRFToken(token) {
        const storedToken = sessionStorage.getItem('csrf_token');
        return token === storedToken;
    }

    static encryptData(data, key = 'emmanuel-royal-band-2024') {
        try {
            // Simple XOR encryption for basic protection (not for highly sensitive data)
            let result = '';
            for (let i = 0; i < data.length; i++) {
                result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return btoa(result);
        } catch (error) {
            console.error('Encryption error:', error);
            return data;
        }
    }

    static decryptData(encryptedData, key = 'emmanuel-royal-band-2024') {
        try {
            const data = atob(encryptedData);
            let result = '';
            for (let i = 0; i < data.length; i++) {
                result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return result;
        } catch (error) {
            console.error('Decryption error:', error);
            return encryptedData;
        }
    }

    static detectSuspiciousActivity(action, data) {
        const suspiciousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
            /javascript:/gi, // JavaScript protocol
            /on\w+\s*=/gi, // Event handlers
            /eval\s*\(/gi, // eval function
            /union\s+select/gi, // SQL injection
            /drop\s+table/gi, // SQL injection
            /<iframe/gi, // Iframe tags
            /<object/gi, // Object tags
            /<embed/gi // Embed tags
        ];

        const dataString = JSON.stringify(data).toLowerCase();
        
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(dataString)) {
                console.error('🚨 Suspicious activity detected:', {
                    action,
                    pattern: pattern.source,
                    data: dataString.substring(0, 200) + '...'
                });
                
                // Log to security monitoring
                this.logSecurityEvent('SUSPICIOUS_ACTIVITY', {
                    action,
                    pattern: pattern.source,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                });
                
                return true;
            }
        }
        
        return false;
    }

    static logSecurityEvent(type, details) {
        const securityLog = JSON.parse(localStorage.getItem('security_log') || '[]');
        
        securityLog.push({
            type,
            details,
            timestamp: new Date().toISOString(),
            ip: 'client-side' // Real IP would be logged server-side
        });
        
        // Keep only last 1000 events
        if (securityLog.length > 1000) {
            securityLog.splice(0, securityLog.length - 1000);
        }
        
        localStorage.setItem('security_log', JSON.stringify(securityLog));
        
        // Notify admin (in real app, this would be a server call)
        if (type === 'SUSPICIOUS_ACTIVITY') {
            AppNotifications.securityAlert(`Suspicious activity detected: ${type}`);
        }
    }

    static sanitizeHTML(html) {
        const allowedTags = {
            'b': [], 'i': [], 'u': [], 'em': [], 'strong': [], 
            'p': [], 'br': [], 'ul': [], 'ol': [], 'li': [],
            'h1': [], 'h2': [], 'h3': [], 'h4': [], 'h5': [], 'h6': [],
            'span': ['class'], 'div': ['class'], 'a': ['href', 'title'],
            'img': ['src', 'alt', 'title', 'width', 'height']
        };
        
        const allowedAttributes = {
            'href': /^(https?:\/\/|mailto:|tel:)/,
            'src': /^https?:\/\//,
            'class': /^[a-zA-Z0-9\s\-_]+$/,
            'alt': /^[\w\s\-_]+$/,
            'title': /^[\w\s\-_]+$/,
            'width': /^\d+$/,
            'height': /^\d+$/
        };

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            this.sanitizeNode(doc.body, allowedTags, allowedAttributes);
            
            return doc.body.innerHTML;
        } catch (error) {
            console.error('HTML sanitization error:', error);
            return this.preventXSS(html);
        }
    }

    static sanitizeNode(node, allowedTags, allowedAttributes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            
            if (!allowedTags[tagName]) {
                node.parentNode.removeChild(node);
                return;
            }
            
            // Remove disallowed attributes
            const attributes = Array.from(node.attributes);
            for (const attr of attributes) {
                if (!allowedTags[tagName].includes(attr.name) || 
                    (allowedAttributes[attr.name] && !allowedAttributes[attr.name].test(attr.value))) {
                    node.removeAttribute(attr.name);
                }
            }
            
            // Sanitize children recursively
            for (let i = node.childNodes.length - 1; i >= 0; i--) {
                this.sanitizeNode(node.childNodes[i], allowedTags, allowedAttributes);
            }
        }
    }

    // Rate limiting utility
    static createRateLimiter(maxRequests, timeWindow) {
        const requests = new Map();
        
        return function(identifier) {
            const now = Date.now();
            const windowStart = now - timeWindow;
            
            // Clean up old entries
            for (const [key, timestamp] of requests.entries()) {
                if (timestamp < windowStart) {
                    requests.delete(key);
                }
            }
            
            const userRequests = Array.from(requests.entries())
                .filter(([key]) => key.startsWith(identifier))
                .map(([, timestamp]) => timestamp)
                .filter(timestamp => timestamp > windowStart);
            
            if (userRequests.length >= maxRequests) {
                return false;
            }
            
            requests.set(identifier + ':' + now, now);
            return true;
        };
    }
}

// Initialize CSRF protection
document.addEventListener('DOMContentLoaded', () => {
    // Add CSRF token to all forms
    document.querySelectorAll('form').forEach(form => {
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = 'csrf_token';
        csrfInput.value = SecurityUtils.generateCSRFToken();
        form.appendChild(csrfInput);
    });
});

// Export for use in other modules
window.SecurityUtils = SecurityUtils;
