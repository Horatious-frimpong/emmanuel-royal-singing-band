// leader-auth.js - Separate leader authentication system
class LeaderAuth {
    constructor() {
        this.superAdminEmail = 'horatiousfrimpong@gmail.com';
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('leaderRegisterForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.registerLeader();
        });
    }

    async registerLeader() {
        const name = document.getElementById('leaderName').value;
        const email = document.getElementById('leaderEmail').value;
        const phone = document.getElementById('leaderPhone').value;
        const role = document.getElementById('leaderRole').value;
        const password = document.getElementById('leaderPassword').value;

        if (!name || !email || !phone || !role || !password) {
            alert('Please fill in all fields');
            return;
        }

        if (password.length < 6) {
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
            // Check if email already exists in leaders table
            const { data: existingLeader } = await supabase
                .from('leaders')
                .select('email')
                .eq('email', sanitizedEmail)
                .single();

            if (existingLeader) {
                throw new Error('This email is already registered as a leader!');
            }

            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: sanitizedEmail,
                password: password,
            });

            if (authError) throw authError;

            // Wait for user to be fully created
            console.log('Waiting for user creation...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            let finalRole = role;
            let finalStatus = 'pending';
            let finalIsActive = false;

            // Auto-approve if it's super admin email
            if (sanitizedEmail === this.superAdminEmail) {
                finalRole = 'Super Admin';
                finalStatus = 'approved';
                finalIsActive = true;
                console.log('Super Admin detected - auto-approving...');
            }

            // Insert into leaders table
            const { error: leaderError } = await supabase
                .from('leaders')
                .insert([{
                    user_id: authData.user.id,
                    email: sanitizedEmail,
                    role: finalRole,
                    status: finalStatus,
                    added_by: 'self-registration',
                    is_active: finalIsActive,
                    approved_at: finalStatus === 'approved' ? new Date() : null
                }]);

            if (leaderError) throw leaderError;

            // Also add to members table if not already there
            try {
                const { error: memberError } = await supabase
                    .from('members')
                    .insert([{
                        user_id: authData.user.id,
                        email: sanitizedEmail,
                        name: sanitizedName,
                        phone: sanitizedPhone,
                        voice_part: 'Leader',
                        profile_picture: 'images/514-5147412_default-avatar-png.png',
                        created_at: new Date()
                    }]);

                if (memberError && !memberError.message.includes('duplicate key')) {
                    console.log('Note: Could not add to members table:', memberError.message);
                }
            } catch (memberError) {
                console.log('Note: Member insertion skipped:', memberError.message);
            }

            // Show appropriate success message
            if (sanitizedEmail === this.superAdminEmail) {
                alert('🎉 Super Admin registered and auto-approved! You can now access the admin dashboard.');
            } else {
                alert('✅ Leader registration submitted! Your account is pending approval from Super Admin. You will be notified once approved.');
            }

            // Auto-login
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email: sanitizedEmail,
                password: password
            });

            if (loginError) throw loginError;

            // Redirect based on approval status
            if (finalStatus === 'approved') {
                window.location.href = 'leadership.html';
            } else {
                window.location.href = 'member-dashboard.html';
            }

        } catch (error) {
            alert('Registration failed: ' + error.message);
            console.error('Leader registration error:', error);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new LeaderAuth();
});
