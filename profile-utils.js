// profile-utils.js - Enhanced profile picture handling
class ProfileUtils {
    static async getProfilePictureUrl(email) {
        // ✅ ROBUST: Check if Supabase is available BEFORE using it
        if (typeof supabase === 'undefined') {
            console.error('❌ Supabase not available in ProfileUtils');
            return 'images/514-5147412_default-avatar-png.png';
        }
        
        try {
            const { data: member, error } = await supabase
                .from('members')
                .select('profile_picture')
                .eq('email', email)
                .single();
                
            // ✅ ROBUST: Check for Supabase errors
            if (error) {
                console.error('Supabase error for email:', email, error);
                return 'images/514-5147412_default-avatar-png.png';
            }
                
            // ✅ ROBUST: Simplified URL checking
            if (member && member.profile_picture) {
                return member.profile_picture;
            }
            return 'images/514-5147412_default-avatar-png.png';
        } catch (error) {
            console.error('Error getting profile picture for:', email, error);
            return 'images/514-5147412_default-avatar-png.png';
        }
    }
    
    static setProfilePicture(imgElement, url) {
        // ✅ ROBUST: Better error logging
        if (url && url.startsWith('http')) {
            imgElement.src = url;
            imgElement.onerror = function() {
                console.error('Failed to load profile picture from URL:', url);
                this.src = 'images/514-5147412_default-avatar-png.png';
            };
        } else {
            imgElement.src = url || 'images/514-5147412_default-avatar-png.png';
        }
    }
    
    // ✅ ROBUST: Added new method for user ID lookup
    static async getProfilePictureByUserId(userId) {
        if (typeof supabase === 'undefined') {
            console.error('❌ Supabase not available in ProfileUtils');
            return 'images/514-5147412_default-avatar-png.png';
        }
        
        try {
            const { data: member, error } = await supabase
                .from('members')
                .select('profile_picture')
                .eq('user_id', userId)
                .single();
                
            if (error) throw error;
                
            if (member && member.profile_picture) {
                return member.profile_picture;
            }
            return 'images/514-5147412_default-avatar-png.png';
        } catch (error) {
            console.error('Error getting profile picture for user ID:', userId, error);
            return 'images/514-5147412_default-avatar-png.png';
        }
    }
}
