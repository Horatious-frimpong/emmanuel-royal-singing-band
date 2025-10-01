// profile-utils.js - Enhanced profile picture handling
class ProfileUtils {
    static async getProfilePictureUrl(email) {
        try {
            const { data: member, error } = await supabase
                .from('members')
                .select('profile_picture')
                .eq('email', email)
                .single();
                
            if (member && member.profile_picture) {
                if (member.profile_picture.startsWith('http')) {
                    return member.profile_picture;
                } else if (member.profile_picture.startsWith('images/')) {
                    return member.profile_picture;
                }
            }
            return 'images/514-5147412_default-avatar-png.png';
        } catch (error) {
            console.error('Error getting profile picture for:', email, error);
            return 'images/514-5147412_default-avatar-png.png';
        }
    }
    
    static setProfilePicture(imgElement, url) {
        if (url && url.startsWith('http')) {
            imgElement.src = url;
            imgElement.onerror = function() {
                this.src = 'images/514-5147412_default-avatar-png.png';
            };
        } else {
            imgElement.src = url || 'images/514-5147412_default-avatar-png.png';
        }
    }
}
