// admin-dashboard.js - CLEAN VERSION
class AdminDashboard {
    constructor() {
        this.init();
    }

    async init() {
        await this.checkAdminAccess();
        this.setupEventListeners();
    }

    async checkAdminAccess() {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            // Simple check: if user is in leaders table and approved
            const { data: leader } = await supabase
                .from('leaders')
                .select('*')
                .eq('email', user.email)
                .eq('status', 'approved')
                .eq('is_active', true)
                .single();

            if (leader) {
                document.getElementById('admin-dashboard').style.display = 'block';
                this.loadDashboardData();
                
                // Show leader management for super admin
                if (leader.role === 'Super Admin') {
                    this.showLeaderManagement();
                }
            }
        }
    }

    showLeaderManagement() {
        const leaderSection = document.querySelector('.leader-management');
        if (leaderSection) leaderSection.style.display = 'block';
        this.loadLeadersList();
        this.loadGalleryManagement();
    }

    setupEventListeners() {
        // Announcements
        document.getElementById('announcementForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.postAnnouncement();
        });

        // Events
        document.getElementById('eventForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addEvent();
        });

        // Music management
        document.getElementById('addSongForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSong();
        });

        // Leader management
        document.getElementById('searchMemberForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.searchMember();
        });

        // Close modals
        document.querySelectorAll('.close-modal').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            });
        });
    }

    async loadDashboardData() {
        await this.loadAnnouncements();
        await this.loadEvents();
        await this.loadMusicRepertoire();
        await this.loadStats();
    }

    async loadAnnouncements() {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (data) {
                this.displayAnnouncements(data);
            }
        } catch (error) {
            console.error('Error loading announcements:', error);
        }
    }

    displayAnnouncements(announcements) {
        const container = document.getElementById('adminAnnouncementsList');
        if (!container) return;

        if (announcements.length === 0) {
            container.innerHTML = '<p class="no-data">No announcements yet</p>';
            return;
        }

        container.innerHTML = announcements.map(announcement => {
            const date = new Date(announcement.created_at).toLocaleDateString();
            return `
                <div class="announcement-item ${announcement.is_urgent ? 'urgent' : ''}">
                    <h4>${SecurityUtils.preventXSS(announcement.title)}</h4>
                    <p>${SecurityUtils.preventXSS(announcement.message)}</p>
                    <span class="announcement-date">${date}</span>
                </div>
            `;
        }).join('');
    }

    async postAnnouncement() {
        const title = document.getElementById('announcementTitle').value;
        const message = document.getElementById('announcementMessage').value;
        const isUrgent = document.getElementById('announcementUrgent').checked;

        if (!title || !message) {
            alert('Please fill in all fields');
            return;
        }

        try {
            const { error } = await supabase
                .from('announcements')
                .insert([{
                    title: SecurityUtils.sanitizeInput(title),
                    message: SecurityUtils.sanitizeInput(message),
                    is_urgent: isUrgent,
                    author_id: (await supabase.auth.getUser()).data.user.id
                }]);

            if (error) throw error;

            alert('Announcement posted successfully!');
            document.getElementById('announcementForm').reset();
            this.loadAnnouncements();
        } catch (error) {
            alert('Error posting announcement: ' + error.message);
        }
    }

    async loadEvents() {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('event_date')
                .limit(10);

            if (data) {
                this.displayEvents(data);
            }
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }

    displayEvents(events) {
        const container = document.getElementById('adminEventsList');
        if (!container) return;

        if (events.length === 0) {
            container.innerHTML = '<p class="no-data">No events scheduled</p>';
            return;
        }

        container.innerHTML = events.map(event => {
            const eventDate = new Date(event.event_date);
            const formattedDate = eventDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            const formattedTime = eventDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });

            return `
                <div class="event-item">
                    <div class="event-date">
                        <span class="event-day">${eventDate.getDate()}</span>
                        <span class="event-month">${eventDate.toLocaleString('en', { month: 'short' })}</span>
                    </div>
                    <div class="event-details">
                        <h4>${SecurityUtils.preventXSS(event.title)}</h4>
                        <p>${event.location ? SecurityUtils.preventXSS(event.location) + ' • ' : ''}${formattedDate} at ${formattedTime}</p>
                        ${event.description ? `<p class="event-description">${SecurityUtils.preventXSS(event.description)}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async addEvent() {
        const title = document.getElementById('eventTitle').value;
        const date = document.getElementById('eventDate').value;
        const time = document.getElementById('eventTime').value;
        const location = document.getElementById('eventLocation').value;
        const description = document.getElementById('eventDescription').value;

        if (!title || !date || !time) {
            alert('Please fill in required fields');
            return;
        }

        const eventDateTime = new Date(`${date}T${time}`);

        try {
            const { error } = await supabase
                .from('events')
                .insert([{
                    title: SecurityUtils.sanitizeInput(title),
                    event_date: eventDateTime.toISOString(),
                    location: SecurityUtils.sanitizeInput(location),
                    description: SecurityUtils.sanitizeInput(description)
                }]);

            if (error) throw error;

            alert('Event added successfully!');
            document.getElementById('eventForm').reset();
            this.loadEvents();
        } catch (error) {
            alert('Error adding event: ' + error.message);
        }
    }

    async loadMusicRepertoire() {
        try {
            const { data, error } = await supabase
                .from('music_repertoire')
                .select('*')
                .order('category')
                .order('title');

            if (data) {
                this.displayMusicRepertoire(data);
            }
        } catch (error) {
            console.error('Error loading music repertoire:', error);
        }
    }

    displayMusicRepertoire(songs) {
        const container = document.getElementById('musicRepertoireList');
        if (!container) return;

        if (songs.length === 0) {
            container.innerHTML = '<p class="no-data">No songs in repertoire</p>';
            return;
        }

        // Group by category
        const songsByCategory = {};
        songs.forEach(song => {
            if (!songsByCategory[song.category]) {
                songsByCategory[song.category] = [];
            }
            songsByCategory[song.category].push(song);
        });

        container.innerHTML = Object.keys(songsByCategory).map(category => {
            const categorySongs = songsByCategory[category];
            return `
                <div class="music-category">
                    <h3>${SecurityUtils.preventXSS(category)}</h3>
                    <div class="song-list">
                        ${categorySongs.map(song => `
                            <div class="song-item ${song.is_active ? '' : 'inactive'}">
                                <span>${SecurityUtils.preventXSS(song.title)}</span>
                                ${song.language && song.language !== 'English' ? 
                                    `<span class="language-badge">${song.language}</span>` : ''}
                                <span class="song-status">${song.is_active ? 'Active' : 'Inactive'}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    async addSong() {
        const title = document.getElementById('songTitle').value;
        const category = document.getElementById('songCategory').value;
        const language = document.getElementById('songLanguage').value;

        if (!title || !category) {
            alert('Please fill in required fields');
            return;
        }

        try {
            const { error } = await supabase
                .from('music_repertoire')
                .insert([{
                    title: SecurityUtils.sanitizeInput(title),
                    category: SecurityUtils.sanitizeInput(category),
                    language: SecurityUtils.sanitizeInput(language || 'English'),
                    added_by: (await supabase.auth.getUser()).data.user.email
                }]);

            if (error) throw error;

            alert('Song added successfully!');
            document.getElementById('addSongForm').reset();
            this.loadMusicRepertoire();
        } catch (error) {
            alert('Error adding song: ' + error.message);
        }
    }

    async loadStats() {
        try {
            // Total members
            const { count: totalMembers } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true });

            // Total songs
            const { count: totalSongs } = await supabase
                .from('music_repertoire')
                .select('*', { count: 'exact', head: true });

            // Upcoming events
            const { count: upcomingEvents } = await supabase
                .from('events')
                .select('*', { count: 'exact', head: true })
                .gte('event_date', new Date().toISOString());

            document.getElementById('totalMembersCount').textContent = totalMembers || '0';
            document.getElementById('totalSongsCount').textContent = totalSongs || '0';
            document.getElementById('upcomingEventsCount').textContent = upcomingEvents || '0';
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadLeadersList() {
        try {
            const { data, error } = await supabase
                .from('leaders')
                .select('*')
                .order('role');

            if (data) {
                this.displayLeadersList(data);
            }
        } catch (error) {
            console.error('Error loading leaders:', error);
        }
    }

    displayLeadersList(leaders) {
        const container = document.getElementById('leadersList');
        const pendingContainer = document.getElementById('pendingApprovalsList');
        
        if (!container || !pendingContainer) return;

        const approvedLeaders = leaders.filter(leader => leader.status === 'approved' && leader.is_active);
        const pendingLeaders = leaders.filter(leader => leader.status === 'pending');

        // Approved leaders
        if (approvedLeaders.length === 0) {
            container.innerHTML = '<p class="no-data">No approved leaders</p>';
        } else {
            container.innerHTML = approvedLeaders.map(leader => `
                <div class="leader-item">
                    <div class="leader-info">
                        <h5>${SecurityUtils.preventXSS(leader.email)}</h5>
                        <p class="leader-meta">${leader.role} • Added by ${leader.added_by}</p>
                    </div>
                    <div class="leader-actions">
                        <button class="remove-btn" onclick="adminDashboard.removeLeader('${leader.id}')">Remove</button>
                    </div>
                </div>
            `).join('');
        }

        // Pending approvals
        if (pendingLeaders.length === 0) {
            pendingContainer.innerHTML = '<p class="no-data">No pending approvals</p>';
        } else {
            pendingContainer.innerHTML = pendingLeaders.map(leader => `
                <div class="pending-approval-item">
                    <div class="pending-info">
                        <h5>${SecurityUtils.preventXSS(leader.email)}</h5>
                        <p class="request-date">Requested role: ${leader.role}</p>
                    </div>
                    <div class="approval-actions">
                        <button class="approve-btn" onclick="adminDashboard.approveLeader('${leader.id}')">Approve</button>
                        <button class="reject-btn" onclick="adminDashboard.rejectLeader('${leader.id}')">Reject</button>
                    </div>
                </div>
            `).join('');
        }
    }

    async searchMember() {
        const searchEmail = document.getElementById('searchMemberEmail').value;

        if (!searchEmail) {
            alert('Please enter an email address');
            return;
        }

        try {
            const { data: member, error } = await supabase
                .from('members')
                .select('*')
                .eq('email', searchEmail)
                .single();

            const resultContainer = document.getElementById('searchResult');
            
            if (member) {
                resultContainer.innerHTML = `
                    <div class="member-found">
                        <h4>Member Found</h4>
                        <p><strong>Name:</strong> ${SecurityUtils.preventXSS(member.name)}</p>
                        <p><strong>Email:</strong> ${SecurityUtils.preventXSS(member.email)}</p>
                        <p><strong>Voice Part:</strong> ${SecurityUtils.preventXSS(member.voice_part)}</p>
                        <button class="hero-btn" onclick="adminDashboard.addAsLeader('${member.email}', '${member.name}')">
                            Add as Leader
                        </button>
                    </div>
                `;
            } else {
                resultContainer.innerHTML = '<p class="no-data">Member not found</p>';
            }
        } catch (error) {
            document.getElementById('searchResult').innerHTML = '<p class="no-data">Member not found</p>';
        }
    }

    async addAsLeader(email, name) {
        const role = prompt(`Enter role for ${name}:`, 'Leader');
        
        if (!role) return;

        try {
            const { error } = await supabase
                .from('leaders')
                .insert([{
                    email: email,
                    role: role,
                    status: 'approved',
                    added_by: (await supabase.auth.getUser()).data.user.email,
                    is_active: true,
                    approved_at: new Date()
                }]);

            if (error) throw error;

            alert('Leader added successfully!');
            this.loadLeadersList();
            document.getElementById('searchResult').innerHTML = '';
            document.getElementById('searchMemberEmail').value = '';
        } catch (error) {
            alert('Error adding leader: ' + error.message);
        }
    }

    async approveLeader(leaderId) {
        try {
            const { error } = await supabase
                .from('leaders')
                .update({
                    status: 'approved',
                    is_active: true,
                    approved_at: new Date()
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
        try {
            const { error } = await supabase
                .from('leaders')
                .update({
                    status: 'rejected',
                    is_active: false
                })
                .eq('id', leaderId);

            if (error) throw error;

            alert('Leader request rejected');
            this.loadLeadersList();
        } catch (error) {
            alert('Error rejecting leader: ' + error.message);
        }
    }

    async removeLeader(leaderId) {
        if (!confirm('Are you sure you want to remove this leader?')) return;

        try {
            const { error } = await supabase
                .from('leaders')
                .update({
                    status: 'removed',
                    is_active: false
                })
                .eq('id', leaderId);

            if (error) throw error;

            alert('Leader removed successfully');
            this.loadLeadersList();
        } catch (error) {
            alert('Error removing leader: ' + error.message);
        }
    }

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
            console.error('Error loading gallery:', error);
        }
    }

    displayGalleryManagement(photos) {
        const container = document.getElementById('galleryManagementList');
        if (!container) return;

        if (photos.length === 0) {
            container.innerHTML = '<p class="no-data">No photos in gallery</p>';
            return;
        }

        container.innerHTML = photos.map(photo => `
            <div class="gallery-management-item ${photo.is_active ? '' : 'inactive'}">
                <div class="gallery-photo-preview">
                    <img src="${photo.image_url}" alt="Gallery photo" onerror="this.style.display='none'">
                </div>
                <div class="gallery-info">
                    <p><strong>Description:</strong> ${photo.description ? SecurityUtils.preventXSS(photo.description) : 'No description'}</p>
                    <p><strong>Uploaded by:</strong> ${photo.uploaded_by || 'Unknown'}</p>
                    <span class="photo-status">${photo.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div class="gallery-actions">
                    <button class="remove-btn" onclick="adminDashboard.togglePhotoStatus('${photo.id}', ${!photo.is_active})">
                        ${photo.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="reject-btn" onclick="adminDashboard.deletePhoto('${photo.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async togglePhotoStatus(photoId, newStatus) {
        try {
            const { error } = await supabase
                .from('gallery_photos')
                .update({ is_active: newStatus })
                .eq('id', photoId);

            if (error) throw error;

            alert(`Photo ${newStatus ? 'activated' : 'deactivated'} successfully`);
            this.loadGalleryManagement();
        } catch (error) {
            alert('Error updating photo status: ' + error.message);
        }
    }

    async deletePhoto(photoId) {
        if (!confirm('Are you sure you want to delete this photo?')) return;

        try {
            const { error } = await supabase
                .from('gallery_photos')
                .delete()
                .eq('id', photoId);

            if (error) throw error;

            alert('Photo deleted successfully');
            this.loadGalleryManagement();
        } catch (error) {
            alert('Error deleting photo: ' + error.message);
        }
    }
}

// Initialize admin dashboard
const adminDashboard = new AdminDashboard();
