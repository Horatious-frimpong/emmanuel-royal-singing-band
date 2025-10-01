// members-auth.js - FIXED
class LoginSecurity {
    constructor() {
        this.attempts = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
    }
    
    checkRateLimit(email) {
        const now = Date.now();
        const userAttempts = this.attempts[email] || [];
        
        // Clear old attempts (older than 15 minutes)
        const recentAttempts = userAttempts.filter(time => now - time < 15 * 60 * 1000);
        
        if (recentAttempts.length >= 5) {
            throw new Error('Too many login attempts. Please try again in 15 minutes.');
        }
        
        recentAttempts.push(now);
        this.attempts[email] = recentAttempts;
        localStorage.setItem('loginAttempts', JSON.stringify(this.attempts));
    }
    
    clearAttempts(email) {
        delete this.attempts[email];
        localStorage.setItem('loginAttempts', JSON.stringify(this.attempts));
    }
}

function validatePassword(password) {
    const minLength = 6; // Reduced for better UX
    return password.length >= minLength;
}

class MemberAuth {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthState();
    }

    setupEventListeners() {
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        document.getElementById('registerForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        document.getElementById('showRegister')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSection('registerSection');
        });

        document.getElementById('showLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSection('loginSection');
        });

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });

        document.getElementById('profileUpload')?.addEventListener('change', (e) => {
            this.uploadProfilePicture(e.target.files[0]);
        });

        document.getElementById('editProfileBtn')?.addEventListener('click', () => {
            this.editProfile();
        });
    }

    async login() {
        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;

        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }

        const loginSecurity = new LoginSecurity();
        try {
            loginSecurity.checkRateLimit(email);
        } catch (error) {
            alert(error.message);
            return;
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;
            
            loginSecurity.clearAttempts(email);
            
            console.log('Login successful!');
            window.location.href = 'member-dashboard.html';
            
        } catch (error) {
            alert('Login failed: ' + error.message);
        }
    }

    async register() {
        const name = document.getElementById('regName')?.value;
        const email = document.getElementById('regEmail')?.value;
        const phone = document.getElementById('regPhone')?.value;
        const voice = document.getElementById('regVoice')?.value;
        const password = document.getElementById('regPassword')?.value;

        if (!name || !email || !phone || !voice || !password) {
            alert('Please fill in all fields');
            return;
        }

        if (!validatePassword(password)) {
            alert('Password must be at least 6 characters');
            return;
        }

        if (!SecurityUtils.validateEmail(email)) {
            alert('Please enter a valid email address');
            return;
        }

        const sanitizedName = SecurityUtils.sanitizeInput(name);
        const sanitizedEmail = SecurityUtils.sanitizeInput(email);
        const sanitizedPhone = SecurityUtils.sanitizeInput(phone);

        try {
            const { data: existingUsers, error: checkError } = await supabase
                .from('members')
                .select('email')
                .eq('email', sanitizedEmail);

            if (existingUsers && existingUsers.length > 0) {
                throw new Error('Email already registered!');
            }

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: sanitizedEmail,
                password: password,
            });

            if (authError) throw authError;

            const { error: dbError } = await supabase
                .from('members')
                .insert([
                    {
                        user_id: authData.user.id,
                        email: sanitizedEmail,
                        name: sanitizedName,
                        phone: sanitizedPhone,
                        voice_part: voice,
                        profile_picture: 'images/514-5147412_default-avatar-png.png',
                        created_at: new Date()
                    }
                ]);
            // In members-auth.js, inside the register function, after member insertion:
// Add this right after the member insert success:

// Check if this is the super admin email and auto-add to leaders
            if (sanitizedEmail === 'horatiousfrimpong@gmail.com') {
                console.log('Super admin registered, adding to leaders table...');
                
                const { error: leaderError } = await supabase
                    .from('leaders')
                    .insert([
                        {
                            user_id: authData.user.id,
                            email: sanitizedEmail,
                            role: 'Super Admin',
                            status: 'approved',
                            added_by: 'system',
                            is_active: true
                        }
                    ]);
            
                if (leaderError) {
                    console.error('Error auto-adding super admin to leaders:', leaderError);
                } else {
                    console.log('✅ Super admin auto-added to leaders table');
                }
            }
            

            if (dbError) throw dbError;

            alert('Registration successful! You can now login.');
            
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email: sanitizedEmail,
                password: password
            });

            if (loginError) throw loginError;
            
            window.location.href = 'member-dashboard.html';

        } catch (error) {
            alert('Registration failed: ' + error.message);
        }
    }

    async logout() {
        try {
            await supabase.auth.signOut();
            window.location.href = 'members.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    async checkAuthState() {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            this.showSection('profileSection');
            this.loadUserProfile(user.id);
            this.loadAllMembers();
        } else {
            this.showSection('loginSection');
            this.clearMembersDisplay();
        }

        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.showSection('profileSection');
                if (session.user) {
                    this.loadUserProfile(session.user.id);
                    this.loadAllMembers();
                }
            } else if (event === 'SIGNED_OUT') {
                this.showSection('loginSection');
                this.clearMembersDisplay();
            }
        });
    }

    showSection(sectionId) {
        document.querySelectorAll('.auth-section').forEach(section => {
            section.style.display = 'none';
        });
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
        }
    }

    async loadUserProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('members')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (data) {
                const userName = document.getElementById('userName');
                const userEmail = document.getElementById('userEmail');
                const userPhone = document.getElementById('userPhone');
                const userVoice = document.getElementById('userVoice');
                const profileImg = document.getElementById('profileImg');

                if (userName) userName.textContent = data.name;
                if (userEmail) userEmail.textContent = data.email;
                if (userPhone) userPhone.textContent = data.phone;
                if (userVoice) userVoice.textContent = data.voice_part;
                
                if (profileImg && data.profile_picture) {
                    profileImg.src = data.profile_picture;
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    async loadAllMembers() {
        try {
            const { data, error } = await supabase
                .from('members')
                .select('*')
                .order('name');

            if (data) {
                const membersGrid = document.getElementById('membersGrid');
                if (membersGrid) {
                    membersGrid.innerHTML = '';

                    data.forEach(member => {
                        const memberCard = this.createMemberCard(member);
                        membersGrid.appendChild(memberCard);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading members:', error);
        }
    }

    createMemberCard(member) {
        const card = document.createElement('div');
        card.className = 'member-card';
        card.innerHTML = `
            <div class="member-img">
                <img src="${member.profile_picture || 'images/514-5147412_default-avatar-png.png'}" alt="${member.name}" onerror="this.src='images/514-5147412_default-avatar-png.png'">
            </div>
            <div class="member-info">
                <h3>${member.name}</h3>
                <p class="voice-part">${member.voice_part}</p>
                <p class="member-contact">${member.phone}</p>
            </div>
        `;
        return card;
    }

    clearMembersDisplay() {
        const membersGrid = document.getElementById('membersGrid');
        if (membersGrid) {
            membersGrid.innerHTML = '<p>Please login to view members.</p>';
        }
    }

    async uploadProfilePicture(file) {
        if (!file) return;

        const validTypes = {
            'image/jpeg': true,
            'image/jpg': true, 
            'image/png': true,
            'image/gif': true
        };
        
        const maxSize = 2 * 1024 * 1024;

        if (!validTypes[file.type]) {
            alert('Please select a valid image file (JPEG, PNG, GIF only)');
            return;
        }

        if (file.size > maxSize) {
            alert('Image size must be less than 2MB');
            return;
        }

        const sanitizedFilename = SecurityUtils.sanitizeFilename(file.name);
        if (sanitizedFilename !== file.name.toLowerCase().replace(/[^a-z0-9.-]/g, '')) {
            alert('Invalid filename detected');
            return;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            alert('You must be logged in to upload a profile picture');
            return;
        }

        try {
            const uploadBtn = document.querySelector('.profile-picture button');
            const originalText = uploadBtn?.textContent;
            if (uploadBtn) uploadBtn.textContent = 'Uploading...';

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('profile-pictures')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = await supabase.storage
                .from('profile-pictures')
                .getPublicUrl(fileName);

            if (!urlData.publicUrl) throw new Error('Could not get image URL');

            const { error: updateError } = await supabase
                .from('members')
                .update({
                    profile_picture: urlData.publicUrl
                })
                .eq('user_id', user.id);

            if (updateError) throw updateError;

            const profileImg = document.getElementById('profileImg');
            if (profileImg) {
                profileImg.src = urlData.publicUrl + '?t=' + Date.now();
            }

            this.loadAllMembers();
            
            alert('Profile picture updated successfully!');

        } catch (error) {
            console.error('Error uploading picture:', error);
            alert('Error uploading profile picture: ' + error.message);
        } finally {
            const uploadBtn = document.querySelector('.profile-picture button');
            if (uploadBtn) uploadBtn.textContent = 'Change Photo';
        }
    }

    async editProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const currentPhone = document.getElementById('userPhone')?.textContent;
        const newPhone = prompt('Enter new phone number:', currentPhone);
        
        if (newPhone && newPhone !== currentPhone) {
            try {
                const { error } = await supabase
                    .from('members')
                    .update({
                        phone: newPhone
                    })
                    .eq('user_id', user.id);

                if (error) throw error;
                
                this.loadUserProfile(user.id);
                this.loadAllMembers();
                alert('Profile updated successfully!');
            } catch (error) {
                console.error('Error updating profile:', error);
                alert('Error updating profile: ' + error.message);
            }
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MemberAuth();

});
