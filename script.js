// script.js - Global utilities for all pages

// ✅ ADDED: HTTPS enforcement (3 lines at top)
if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {
    window.location.href = window.location.href.replace('http:', 'https:');
}

// ✅ ADDED: Enhanced Session Manager for timeout protection
class SessionManager {
    constructor() {
        this.timeout = 20 * 60 * 1000; // Reduced to 20 minutes
        this.timer = null;
        this.warningTime = 5 * 60 * 1000; // 5 minute warning
        this.init();
    }

    init() {
        this.resetTimer();
        this.setupEventListeners();
    }

    resetTimer() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.handleTimeout();
        }, this.timeout);
    }

    setupEventListeners() {
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => {
                this.resetTimer();
            });
        });
    }

    async handleTimeout() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Show custom warning modal instead of confirm
            this.showTimeoutWarning();
        }
    }

    showTimeoutWarning() {
        const warning = document.createElement('div');
        warning.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000; border: 3px solid #8B0000; text-align: center;
        `;
        warning.innerHTML = `
            <h3>Session About to Expire</h3>
            <p>Your session will expire due to inactivity. Would you like to stay logged in?</p>
            <button id="extendSession" style="background: #8B0000; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin: 5px;">Stay Logged In</button>
            <button id="logoutSession" style="background: #666; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin: 5px;">Logout</button>
        `;
        
        document.body.appendChild(warning);

        document.getElementById('extendSession').onclick = () => {
            document.body.removeChild(warning);
            this.resetTimer();
        };

        document.getElementById('logoutSession').onclick = async () => {
            document.body.removeChild(warning);
            await supabase.auth.signOut();
            window.location.href = 'members.html';
        };
    }
}

// Initialize Session Manager when page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize session manager for authenticated pages
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        new SessionManager();
    }

    // Set current year in footer
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#') && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Add active class to current page in navigation
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPage || (currentPage === '' && linkHref === 'index.html')) {
            link.classList.add('active');
        }
    });
});