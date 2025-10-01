// members-auth.js - CLEAN VERSION (Members only)
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
    const minLength = 6;
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
        // Add these to your existing setupEventListeners() function
        document.getElementById('editProfileForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfileChanges();
        });
        
        document.getElementById('cancelEdit')?.addEventListener('click', () => {
            this.showSection('profileSection');
            this.loadUserProfile((await supabase.auth.getUser()).data.user.id);
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
        if (success) {
            // ADD THIS ONE LINE:
            AppNotifications.loginSuccess(user.name);
            window.location.href = 'member-dashboard.html';
        }
    }

    async register() {
        const name = document.getElementById('regName')?.value;
        const email = document.getElementById('regEmail')?.value;
        const phone = document.getElementById('regPhone')?.value;
        const voice = document.getElementById('regVoice')?.value;
        const password = document.getElementById('regPassword')?.value;
        const profilePictureFile = document.getElementById('regProfilePicture')?.files[0];
    
        if (!name || !email || !phone || !voice || !password) {
            alert('Please fill in all required fields');
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
            // Check if email already exists
            const { data: existingUsers, error: checkError } = await supabase
                .from('members')
                .select('email')
                .eq('email', sanitizedEmail);
    
            if (existingUsers && existingUsers.length > 0) {
                throw new Error('Email already registered!');
            }
    
            // Step 1: Create auth user first
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: sanitizedEmail,
                password: password,
            });
    
            if (authError) throw authError;
    
            console.log('Auth user created, waiting for user to be ready...');
    
            // Step 2: Wait and get the confirmed user
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
            if (userError || !currentUser) {
                throw new Error('Failed to get user information after registration');
            }
    
            console.log('Current user confirmed:', currentUser.id);
    
// In the register() function, replace the profile picture section:
            let profilePictureUrl = 'images/514-5147412_default-avatar-png.png';
            
            // Upload profile picture if provided
            if (profilePictureFile) {
                try {
                    profilePictureUrl = await this.uploadProfilePictureDuringRegistration(profilePictureFile, currentUser.id);
                    console.log('Profile picture uploaded:', profilePictureUrl);
                } catch (uploadError) {
                    console.error('Error uploading profile picture:', uploadError);
                    profilePictureUrl = 'images/514-5147412_default-avatar-png.png';
                }
            }
            
            // Insert member with profile picture
            const { error: dbError } = await supabase
                .from('members')
                .insert([{
                    user_id: currentUser.id,
                    email: sanitizedEmail,
                    name: sanitizedName,
                    phone: sanitizedPhone,
                    voice_part: voice,
                    profile_picture: profilePictureUrl, // This should be the URL from Supabase Storage
                    created_at: new Date().toISOString()
                }]);
    
            if (dbError) {
                console.error('Database error details:', dbError);
                throw new Error('Failed to create member profile: ' + dbError.message);
            }
    
            console.log('Member record created successfully');
    
            // Step 4: Auto-add super admin if it's your email
            if (sanitizedEmail === 'horatiousfrimpong@gmail.com') {
                console.log('🎯 Super admin detected, auto-adding to leaders table...');
                try {
                    const { error: leaderError } = await supabase
                        .from('leaders')
                        .insert([{
                            user_id: currentUser.id,
                            email: sanitizedEmail,
                            role: 'Super Admin',
                            status: 'approved',
                            added_by: 'system',
                            is_active: true,
                            approved_at: new Date().toISOString()
                        }]);
    
                    if (leaderError) {
                        console.error('Error adding super admin to leaders:', leaderError);
                    } else {
                        console.log('✅ Super admin successfully added to leaders table!');
                    }
                } catch (leaderError) {
                    console.error('Error in super admin setup:', leaderError);
                }
            }
    
            alert('Registration successful! You can now login.');
    
            // Auto-login after successful registration
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email: sanitizedEmail,
                password: password
            });
    
            if (loginError) throw loginError;
    
            window.location.href = 'member-dashboard.html';
    
        } catch (error) {
            console.error('Registration error:', error);
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
                
                // FIXED: Better profile picture handling
                if (profileImg) {
                    if (data.profile_picture && data.profile_picture.startsWith('http')) {
                        // It's a Supabase Storage URL
                        profileImg.src = data.profile_picture;
                        profileImg.onerror = function() {
                            console.error('Failed to load profile picture:', data.profile_picture);
                            this.src = 'images/514-5147412_default-avatar-png.png';
                        };
                    } else {
                        // It's a local path or default
                        profileImg.src = data.profile_picture || 'images/514-5147412_default-avatar-png.png';
                    }
                    console.log('Setting profile image to:', profileImg.src);
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
        
        // FIXED: Better image URL handling
        let imageUrl = 'images/514-5147412_default-avatar-png.png';
        if (member.profile_picture) {
            if (member.profile_picture.startsWith('http')) {
                imageUrl = member.profile_picture;
            } else if (member.profile_picture.startsWith('images/')) {
                imageUrl = member.profile_picture;
            }
        }
        
        card.innerHTML = `
            <div class="member-img">
                <img src="${imageUrl}" alt="${member.name}" 
                     onerror="this.src='images/514-5147412_default-avatar-png.png'"
                     loading="lazy">
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

    async uploadProfilePictureDuringRegistration(file, userId) {
        const validTypes = {
            'image/jpeg': true,
            'image/jpg': true, 
            'image/png': true,
            'image/gif': true
        };
        
        const maxSize = 2 * 1024 * 1024;

        if (!validTypes[file.type]) {
            throw new Error('Please select a valid image file (JPEG, PNG, GIF only)');
        }

        if (file.size > maxSize) {
            throw new Error('Image size must be less than 2MB');
        }

        const sanitizedFilename = SecurityUtils.sanitizeFilename(file.name);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('profile-pictures')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = await supabase.storage
            .from('profile-pictures')
            .getPublicUrl(fileName);

        if (!urlData.publicUrl) throw new Error('Could not get image URL');

        return urlData.publicUrl;
    }

    async editProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
    
        try {
            // Load current user data
            const { data: member, error } = await supabase
                .from('members')
                .select('*')
                .eq('user_id', user.id)
                .single();
    
            if (error) throw error;
    
            // Populate the edit form with current data
            document.getElementById('editName').value = member.name || '';
            document.getElementById('editEmail').value = member.email || '';
            document.getElementById('editPhone').value = member.phone || '';
            document.getElementById('editVoice').value = member.voice_part || '';
    
            // Show edit form, hide profile view
            this.showSection('editProfileSection');
            
        } catch (error) {
            console.error('Error loading profile for editing:', error);
            alert('Error loading profile data: ' + error.message);
        }
    }
    async saveProfileChanges() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
    
        const name = document.getElementById('editName').value;
        const phone = document.getElementById('editPhone').value;
        const voice = document.getElementById('editVoice').value;
    
        if (!name || !phone || !voice) {
            alert('Please fill in all required fields');
            return;
        }
    
        const sanitizedName = SecurityUtils.sanitizeInput(name);
        const sanitizedPhone = SecurityUtils.sanitizeInput(phone);
    
        try {
            const { error } = await supabase
                .from('members')
                .update({
                    name: sanitizedName,
                    phone: sanitizedPhone,
                    voice_part: voice,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);
    
            if (error) throw error;
    
            // Show success message and return to profile view
            alert('Profile updated successfully!');
            this.showSection('profileSection');
            this.loadUserProfile(user.id);
            this.loadAllMembers(); // Refresh members display
            
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Error updating profile: ' + error.message);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MemberAuth();
});





