// admin-dashboard.js - FIXED
class AdminDashboard {
    constructor() {
        this.superAdminEmail = 'horatiousfrimpong@gmail.com';
        this.init();
    }

    async init() {
        await this.checkAdminAccess();
        this.setupEventListeners();
    }

    async checkAdminAccess() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            console.log('🔍 Checking admin access for:', user?.email);
            
            if (!user) {
                console.log('❌ No user logged in');
                return;
            }
    
            // Check if user is super admin by email
            if (user.email === this.superAdminEmail) {
                console.log('✅ Super Admin detected by email:', user.email);
                
                // Make sure super admin is in leaders table
                await this.ensureSuperAdminInLeaders(user);
                
                document.getElementById('admin-dashboard').style.display = 'block';
                this.loadDashboardData();
                this.showLeaderManagement();
                return;
            }
    
            // Check if user is an approved leader
            const { data: leader, error } = await supabase
                .from('leaders')
                .select('*')
                .eq('email', user.email)
                .eq('status', 'approved')
                .eq('is_active', true)
                .single();
    
            console.log('Leader query result:', leader);
    
            if (leader) {
                console.log('✅ Approved leader detected:', leader.role);
                document.getElementById('admin-dashboard').style.display = 'block';
                this.loadDashboardData();
                
                // Show leader management only for super admin
                if (user.email === this.superAdminEmail) {
                    this.showLeaderManagement();
                }
            } else {
                console.log('❌ User is not an approved leader');
                console.log('User email:', user.email);
                console.log('Looking for email in leaders table...');
                
                // Debug: Check what's actually in the leaders table
                const { data: allLeaders } = await supabase
                    .from('leaders')
                    .select('*');
                console.log('All leaders in table:', allLeaders);
            }
        } catch (error) {
            console.error('Error checking admin access:', error);
        }
    }
    
    async ensureSuperAdminInLeaders(user) {
        try {
            // Check if super admin already exists in leaders
            const { data: existingLeader } = await supabase
                .from('leaders')
                .select('*')
                .eq('email', user.email)
                .single();
    
            if (!existingLeader) {
                console.log('➕ Adding super admin to leaders table...');
                
                // Insert super admin into leaders table
                const { error } = await supabase
                    .from('leaders')
                    .insert([
                        {
                            user_id: user.id,
                            email: user.email,
                            role: 'Super Admin',
                            status: 'approved',
                            added_by: 'system',
                            is_active: true,
                            approved_at: new Date()
                        }
                    ]);
    
                if (error) {
                    console.error('❌ Error adding super admin to leaders:', error);
                } else {
                    console.log('✅ Super admin added to leaders table');
                }
            } else {
                console.log('✅ Super admin already in leaders table:', existingLeader);
            }
        } catch (error) {
            console.error('Error ensuring super admin in leaders:', error);
        }
    }
    
    // New function to ensure super admin is in leaders table
    async ensureSuperAdminInLeaders(user) {
        try {
            // Check if super admin already exists in leaders
            const { data: existingLeader } = await supabase
                .from('leaders')
                .select('*')
                .eq('email', user.email)
                .single();
    
            if (!existingLeader) {
                console.log('Adding super admin to leaders table...');
                
                // Insert super admin into leaders table
                const { error } = await supabase
                    .from('leaders')
                    .insert([
                        {
                            user_id: user.id,
                            email: user.email,
                            role: 'Super Admin',
                            status: 'approved',
                            added_by: 'system',
                            is_active: true
                        }
                    ]);
    
                if (error) {
                    console.error('Error adding super admin to leaders:', error);
                } else {
                    console.log('✅ Super admin added to leaders table');
                }
            } else {
                console.log('✅ Super admin already in leaders table');
            }
        } catch (error) {
            console.error('Error ensuring super admin in leaders:', error);
        }
    }
    showLeaderManagement() {
        const leaderSection = document.querySelector('.leader-management');
        if (leaderSection) leaderSection.style.display = 'block';
        this.loadLeadersList();
        this.loadGalleryManagement(); // NEW: Load gallery management
    }

    setupEventListeners() {
        // Announcement form
        document.getElementById('announcementForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.postAnnouncement();
        });

        // Event form
        document.getElementById('eventForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addEvent();
        });

        // Bulk email form
        document.getElementById('bulkEmailForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendBulkEmail();
        });

        // Manual leader addition
        document.getElementById('manualAddLeaderForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('searchMemberEmail').value;
            const role = document.getElementById('leaderRoleSelect').value;
            this.addMemberAsLeader(email, role);
        });

        // Music form
        document.getElementById('addSongForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addNewSong();
        });

        // Gallery upload form
        document.getElementById('galleryUploadForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.uploadGalleryPhoto();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterMembers(e.target.dataset.filter);
            });
        });

        // Search member button
        document.querySelector('.search-btn')?.addEventListener('click', () => {
            this.searchMember();
        });
    }

    async searchMember() {
        const email = document.getElementById('searchMemberEmail').value;
        
        if (!email) {
            alert('Please enter an email address');
            return;
        }

        try {
            const { data: member, error } = await supabase
                .from('members')
                .select('user_id, name, email, voice_part')
                .eq('email', email)
                .single();

            if (error || !member) {
                alert('Member not found! They must register first.');
                return;
            }

            document.getElementById('foundMemberName').textContent = 
                `${member.name} (${member.voice_part}) - ${member.email}`;
            document.getElementById('memberSearchResult').style.display = 'block';

        } catch (error) {
            alert('Error searching for member: ' + error.message);
        }
    }

    async addMemberAsLeader(memberEmail, role) {
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            
            const { data: member, error: memberError } = await supabase
                .from('members')
                .select('user_id, email, name')
                .eq('email', memberEmail)
                .single();

            if (memberError || !member) {
                alert('Member not found! They must register first.');
                return;
            }

            const { data: existingLeader } = await supabase
                .from('leaders')
                .select('*')
                .eq('user_id', member.user_id)
                .single();

            if (existingLeader) {
                if (existingLeader.status === 'approved') {
                    alert('This member is already an approved leader!');
                    return;
                } else if (existingLeader.status === 'pending') {
                    alert('This member already has a pending approval request!');
                    return;
                }
            }

            const { error } = await supabase
                .from('leaders')
                .insert([
                    {
                        user_id: member.user_id,
                        email: member.email,
                        role: role,
                        added_by: currentUser.email,
                        status: 'pending'
                    }
                ]);

            if (error) throw error;

            alert('Leader request added! They will appear in pending approvals.');
            document.getElementById('manualAddLeaderForm').reset();
            document.getElementById('memberSearchResult').style.display = 'none';
            this.loadLeadersList();

        } catch (error) {
            alert('Error adding leader: ' + error.message);
        }
    }

    async loadLeadersList() {
        try {
            const { data, error } = await supabase
                .from('leaders')
                .select(`*, members:user_id (name, email, voice_part)`)
                .order('added_at', { ascending: false });

            if (data) {
                this.displayLeadersList(data);
                this.displayPendingApprovals(data);
            }
        } catch (error) {
            console.error('Error loading leaders:', error);
        }
    }

    displayLeadersList(leaders) {
        const leadersList = document.getElementById('leadersList');
        if (!leadersList) return;
        
        leadersList.innerHTML = '';

        const approvedLeaders = leaders.filter(leader => leader.status === 'approved' && leader.is_active);

        if (approvedLeaders.length === 0) {
            leadersList.innerHTML = '<p>No leaders approved yet.</p>';
            return;
        }

        approvedLeaders.forEach(leader => {
            const leaderItem = document.createElement('div');
            leaderItem.className = 'leader-item approved';
            
            leaderItem.innerHTML = `
                <div class="leader-info">
                    <h5>${leader.members?.name || 'Unknown Member'}</h5>
                    <p>Email: ${leader.members?.email || leader.email} | Role: ${leader.role}</p>
                    <p class="leader-meta">Approved: ${new Date(leader.approved_at).toLocaleDateString()} by ${leader.added_by}</p>
                </div>
                <div class="leader-actions">
                    <button class="remove-btn" onclick="adminDashboard.removeLeader('${leader.id}')">Remove</button>
                </div>
            `;
            leadersList.appendChild(leaderItem);
        });
    }

    displayPendingApprovals(leaders) {
        const pendingContainer = document.getElementById('pendingApprovals');
        if (!pendingContainer) return;
        
        pendingContainer.innerHTML = '';

        const pendingLeaders = leaders.filter(leader => leader.status === 'pending');

        if (pendingLeaders.length === 0) {
            pendingContainer.innerHTML = '<p>No pending approval requests.</p>';
            return;
        }

        pendingLeaders.forEach(leader => {
            const pendingItem = document.createElement('div');
            pendingItem.className = 'pending-approval-item';
            
            pendingItem.innerHTML = `
                <div class="pending-info">
                    <h5>${leader.members?.name || 'Unknown Member'}</h5>
                    <p>Email: ${leader.members?.email || leader.email}</p>
                    <p>Requested Role: ${leader.role}</p>
                    <p class="request-date">Requested: ${new Date(leader.added_at).toLocaleDateString()}</p>
                </div>
                <div class="approval-actions">
                    <button class="approve-btn" onclick="adminDashboard.approveLeader('${leader.id}')">✅ Approve</button>
                    <button class="reject-btn" onclick="adminDashboard.rejectLeader('${leader.id}')">❌ Reject</button>
                </div>
            `;
            pendingContainer.appendChild(pendingItem);
        });
    }

    async approveLeader(leaderId) {
        try {
            const { error } = await supabase
                .from('leaders')
                .update({ 
                    status: 'approved',
                    approved_at: new Date(),
                    is_active: true
                })
                .eq('id', leaderId);

            if (error) throw error;

            alert('Leader approved successfully!');
            this.loadLeadersList();

        } catch (error) {
            alert('Error approving leader: ' + error.message);
        }
    }

    async rejectLeader(leaderId) {
        if (confirm('Are you sure you want to reject this leader request?')) {
            try {
                const { error } = await supabase
                    .from('leaders')
                    .update({ 
                        status: 'rejected',
                        is_active: false
                    })
                    .eq('id', leaderId);

                if (error) throw error;

                alert('Leader request rejected.');
                this.loadLeadersList();

            } catch (error) {
                alert('Error rejecting leader: ' + error.message);
            }
        }
    }

    async removeLeader(leaderId) {
        if (confirm('Are you sure you want to remove this leader?')) {
            try {
                const { error } = await supabase
                    .from('leaders')
                    .update({ 
                        is_active: false,
                        status: 'removed'
                    })
                    .eq('id', leaderId);

                if (error) throw error;
                
                alert('Leader removed successfully!');
                this.loadLeadersList();

            } catch (error) {
                alert('Error removing leader: ' + error.message);
            }
        }
    }

    async loadDashboardData() {
        await this.loadStats();
        await this.loadLeadersList();
        await this.loadMusicRepertoire();
        await this.loadSongsManagementList();
        await this.loadGalleryManagement(); // NEW: Load gallery management
    }

    async loadStats() {
        try {
            const { count: totalMembers } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true });

            document.getElementById('totalMembers').textContent = totalMembers || 0;
            document.getElementById('activeMembers').textContent = Math.floor((totalMembers || 0) * 0.8);
            document.getElementById('upcomingEvents').textContent = '3';
            document.getElementById('pendingTasks').textContent = '2';

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async postAnnouncement() {
        const title = document.getElementById('announcementTitle').value;
        const message = document.getElementById('announcementMessage').value;
        const isUrgent = document.getElementById('isUrgent').checked;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            const { error } = await supabase
                .from('announcements')
                .insert([
                    {
                        title: title,
                        message: message,
                        is_urgent: isUrgent,
                        author_id: user.id,
                        created_at: new Date()
                    }
                ]);

            if (error) throw error;

            alert('Announcement posted successfully!');
            document.getElementById('announcementForm').reset();

        } catch (error) {
            alert('Error posting announcement: ' + error.message);
        }
    }

    async addEvent() {
        const title = document.getElementById('eventTitle').value;
        const date = document.getElementById('eventDate').value;
        const location = document.getElementById('eventLocation').value;
        const description = document.getElementById('eventDescription').value;

        try {
            const { error } = await supabase
                .from('events')
                .insert([
                    {
                        title: title,
                        event_date: date,
                        location: location,
                        description: description,
                        created_at: new Date()
                    }
                ]);

            if (error) throw error;

            alert('Event added successfully!');
            document.getElementById('eventForm').reset();

        } catch (error) {
            alert('Error adding event: ' + error.message);
        }
    }

    filterMembers(filter) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }

    async sendBulkEmail() {
        const recipients = document.getElementById('emailRecipients').value;
        const subject = document.getElementById('emailSubject').value;
        const content = document.getElementById('emailContent').value;

        alert(`Email would be sent to ${recipients} with subject: "${subject}"`);
        document.getElementById('bulkEmailForm').reset();
    }

    // MUSIC MANAGEMENT FUNCTIONS
    async loadMusicRepertoire() {
        try {
            const { data, error } = await supabase
                .from('music_repertoire')
                .select('*')
                .eq('is_active', true)
                .order('title');

            if (data) {
                this.displayMusicRepertoire(data);
            }
        } catch (error) {
            console.error('Error loading music repertoire:', error);
        }
    }

    displayMusicRepertoire(songs) {
        const repertoireContainer = document.getElementById('musicRepertoire');
        if (!repertoireContainer) return;

        const categories = {
            "Methodist Anthems & Traditional Hymns": [],
            "Ghanaian Highlife & Contemporary Worship": [],
            "Choir Specials & Seasonal Songs": [],
            "Local Compositions & Original Songs": []
        };

        songs.forEach(song => {
            if (categories[song.category]) {
                categories[song.category].push(song);
            }
        });

        let html = '';
        
        Object.entries(categories).forEach(([category, songs]) => {
            if (songs.length > 0) {
                html += `
                    <div class="music-category">
                        <h3>🎵 ${category}</h3>
                        <div class="song-list">
                `;
                
                songs.forEach(song => {
                    const languageBadge = song.language !== 'English' ? ` <span class="language-badge">${song.language}</span>` : '';
                    html += `<div class="song-item">"${song.title}"${languageBadge}</div>`;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }
        });

        repertoireContainer.innerHTML = html;
    }

    async addNewSong() {
        const title = document.getElementById('songTitle').value;
        const category = document.getElementById('songCategory').value;
        const language = document.getElementById('songLanguage').value;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            const { error } = await supabase
                .from('music_repertoire')
                .insert([
                    {
                        title: title,
                        category: category,
                        language: language,
                        added_by: user.email
                    }
                ]);

            if (error) throw error;

            alert('Song added successfully!');
            document.getElementById('addSongForm').reset();
            this.loadMusicRepertoire();
            this.loadSongsManagementList();

        } catch (error) {
            alert('Error adding song: ' + error.message);
        }
    }

    async loadSongsManagementList() {
        try {
            const { data, error } = await supabase
                .from('music_repertoire')
                .select('*')
                .order('category')
                .order('title');

            if (data) {
                this.displaySongsManagementList(data);
            }
        } catch (error) {
            console.error('Error loading songs for management:', error);
        }
    }

    displaySongsManagementList(songs) {
        const managementList = document.getElementById('songsManagementList');
        if (!managementList) return;
        
        managementList.innerHTML = '';

        if (songs.length === 0) {
            managementList.innerHTML = '<p>No songs in repertoire yet.</p>';
            return;
        }

        songs.forEach(song => {
            const songItem = document.createElement('div');
            songItem.className = `song-management-item ${song.is_active ? 'active' : 'inactive'}`;
            
            const status = song.is_active ? '🟢 Active' : '🔴 Inactive';
            
            songItem.innerHTML = `
                <div class="song-info">
                    <h5>"${song.title}"</h5>
                    <p>Category: ${song.category} | Language: ${song.language}</p>
                    <p class="song-meta">Added: ${new Date(song.added_at).toLocaleDateString()} by ${song.added_by}</p>
                    <span class="song-status">${status}</span>
                </div>
                <div class="song-actions">
                    <button class="remove-btn" onclick="adminDashboard.toggleSong('${song.id}', ${!song.is_active})">
                        ${song.is_active ? 'Remove' : 'Restore'}
                    </button>
                </div>
            `;
            managementList.appendChild(songItem);
        });
    }

    async toggleSong(songId, newStatus) {
        const action = newStatus ? 'restore' : 'remove';
        
        if (!newStatus && !confirm('Are you sure you want to remove this song from the repertoire?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('music_repertoire')
                .update({ is_active: newStatus })
                .eq('id', songId);

            if (error) throw error;

            alert(`Song ${action}ed successfully!`);
            this.loadMusicRepertoire();
            this.loadSongsManagementList();

        } catch (error) {
            alert(`Error ${action}ing song: ` + error.message);
        }
    }

    // GALLERY MANAGEMENT FUNCTIONS
    async loadGalleryManagement() {
        try {
            const { data, error } = await supabase
                .from('gallery_photos')
                .select('*')
                .order('uploaded_at', { ascending: false });

            if (data) {
                this.displayGalleryManagement(data);
            }
        } catch (error) {
            console.error('Error loading gallery for management:', error);
        }
    }

    displayGalleryManagement(photos) {
        const managementList = document.getElementById('galleryManagementList');
        if (!managementList) return;
        
        managementList.innerHTML = '';

        if (photos.length === 0) {
            managementList.innerHTML = '<p>No photos in gallery yet.</p>';
            return;
        }

        photos.forEach(photo => {
            const photoItem = document.createElement('div');
            photoItem.className = `gallery-management-item ${photo.is_active ? 'active' : 'inactive'}`;
            
            const status = photo.is_active ? '🟢 Active' : '🔴 Inactive';
            
            photoItem.innerHTML = `
                <div class="gallery-photo-preview">
                    <img src="${photo.image_url}" alt="${photo.description || 'Gallery photo'}" 
                         onerror="this.src='images/514-5147412_default-avatar-png.png'">
                </div>
                <div class="gallery-info">
                    <p><strong>Description:</strong> ${photo.description || 'No description'}</p>
                    <p><strong>Uploaded:</strong> ${new Date(photo.uploaded_at).toLocaleDateString()}</p>
                    <span class="photo-status">${status}</span>
                </div>
                <div class="gallery-actions">
                    <button class="remove-btn" onclick="adminDashboard.togglePhoto('${photo.id}', ${!photo.is_active})">
                        ${photo.is_active ? 'Remove' : 'Restore'}
                    </button>
                </div>
            `;
            managementList.appendChild(photoItem);
        });
    }

    async togglePhoto(photoId, newStatus) {
        const action = newStatus ? 'restore' : 'remove';
        
        if (!newStatus && !confirm('Are you sure you want to remove this photo from the gallery?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('gallery_photos')
                .update({ is_active: newStatus })
                .eq('id', photoId);

            if (error) throw error;

            alert(`Photo ${action}ed successfully!`);
            this.loadGalleryManagement();

        } catch (error) {
            alert(`Error ${action}ing photo: ` + error.message);
        }
    }

    async uploadGalleryPhoto() {
        const fileInput = document.getElementById('galleryPhotoUpload');
        const description = document.getElementById('photoDescription').value;
        
        if (!fileInput.files[0]) {
            alert('Please select a photo to upload');
            return;
        }

        const file = fileInput.files[0];
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            alert('Please select a valid image file (JPEG, PNG, GIF only)');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `gallery-${user.id}-${Date.now()}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('gallery-photos')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = await supabase.storage
                .from('gallery-photos')
                .getPublicUrl(fileName);

            if (!urlData.publicUrl) throw new Error('Could not get image URL');

            // Save to gallery_photos table
            const { error: dbError } = await supabase
                .from('gallery_photos')
                .insert([
                    {
                        image_url: urlData.publicUrl,
                        description: description,
                        uploaded_by: user.email,
                        is_active: true
                    }
                ]);

            if (dbError) throw dbError;

            alert('Photo uploaded successfully!');
            document.getElementById('galleryUploadForm').reset();
            this.loadGalleryManagement();

        } catch (error) {
            alert('Error uploading photo: ' + error.message);
        }
    }
}

// Make it globally accessible

const adminDashboard = new AdminDashboard();

