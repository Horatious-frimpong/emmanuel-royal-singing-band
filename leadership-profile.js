// leadership-profile.js - Profile picture loading for leadership page

class LeadershipProfileLoader {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadLeaderProfilePictures();
        this.setupImageRetry();
    }

    async loadLeaderProfilePictures() {
        const leaderImages = document.querySelectorAll('.leader-profile-pic');
        
        console.log(`Found ${leaderImages.length} leader images to load`);
        
        for (const img of leaderImages) {
            const email = img.getAttribute('data-email');
            const role = img.getAttribute('data-role');
            
            if (email && email !== 'example.com') {
                // Add loading state
                img.classList.add('loading');
                
                try {
                    const profileUrl = await ProfileUtils.getProfilePictureUrl(email);
                    ProfileUtils.setProfilePicture(img, profileUrl);
                    
                    // Update alt text for accessibility
                    if (img.closest('.executive-card')) {
                        const nameElement = img.closest('.executive-card').querySelector('h3');
                        if (nameElement) {
                            img.alt = `Profile picture of ${nameElement.textContent}`;
                        }
                    }
                    console.log(`✅ Loaded profile picture for: ${email}`);
                } catch (error) {
                    console.error('❌ Error loading profile picture for:', email, error);
                } finally {
                    // Remove loading state
                    img.classList.remove('loading');
                }
            } else {
                console.warn('⚠️ No valid email found for leader image:', img);
            }
        }
    }

    setupImageRetry() {
        document.addEventListener('error', function(e) {
            if (e.target.classList.contains('leader-profile-pic') || 
                e.target.classList.contains('dashboard-profile-img')) {
                console.log('🔄 Image failed to load, retrying:', e.target.src);
                // Retry after 2 seconds
                setTimeout(() => {
                    const originalSrc = e.target.src;
                    e.target.src = '';
                    e.target.src = originalSrc;
                }, 2000);
            }
        }, true);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for all dependencies to be loaded
    if (typeof supabase !== 'undefined' && typeof ProfileUtils !== 'undefined') {
        new LeadershipProfileLoader();
    } else {
        // Retry after a short delay if dependencies aren't ready
        setTimeout(() => {
            if (typeof supabase !== 'undefined' && typeof ProfileUtils !== 'undefined') {
                new LeadershipProfileLoader();
            } else {
                console.error('❌ Required dependencies not loaded for LeadershipProfileLoader');
            }
        }, 1000);
    }
});
