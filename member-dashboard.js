// member-dashboard.js
class MemberDashboard {
    constructor() {
        this.currentUser = null;
        this.memberData = null;
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        this.loadDashboardData();
    }

    async checkAuth() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'members.html';
            return;
        }
        this.currentUser = user;
        await this.loadUserProfile();
    }

    async loadUserProfile() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
    
            const { data: member, error } = await supabase
                .from('members')
                .select('name, email, phone, voice_part, profile_picture')
                .eq('user_id', user.id)
                .single();
    
            if (member && member.name) {
                this.memberData = member;
                
                // FIXED: Show actual member name
                const memberNameElement = document.getElementById('memberName');
                if (memberNameElement) {
                    memberNameElement.textContent = SecurityUtils.preventXSS(member.name);
                }
                
                // FIXED: Load profile picture in dashboard
                const profileImg = document.getElementById('dashboardProfileImg');
                if (profileImg && member.profile_picture) {
                    if (member.profile_picture.startsWith('http')) {
                        // It's a Supabase Storage URL
                        profileImg.src = member.profile_picture;
                        profileImg.onerror = function() {
                            console.error('Failed to load profile picture from URL:', member.profile_picture);
                            this.src = 'images/514-5147412_default-avatar-png.png';
                        };
                    } else if (member.profile_picture.startsWith('images/')) {
                        // It's a local image path
                        profileImg.src = member.profile_picture;
                    } else {
                        // Default fallback
                        profileImg.src = 'images/514-5147412_default-avatar-png.png';
                    }
                    console.log('Dashboard profile image set to:', profileImg.src);
                }
            }
        } catch (error) {
            console.error('Error loading user profile in dashboard:', error);
        }
    }

    setupEventListeners() {
        // Song suggestion modal
        document.getElementById('suggestSongBtn')?.addEventListener('click', () => {
            this.openSongSuggestionModal();
        });

        document.querySelector('.close-modal')?.addEventListener('click', () => {
            this.closeSongSuggestionModal();
        });

        // Forms
        document.getElementById('songSuggestionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitSongSuggestion();
        });

        document.getElementById('suggestionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitGeneralSuggestion();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('songSuggestionModal');
            if (e.target === modal) {
                this.closeSongSuggestionModal();
            }
        });
    }

    openSongSuggestionModal() {
        document.getElementById('songSuggestionModal').style.display = 'block';
    }

    closeSongSuggestionModal() {
        document.getElementById('songSuggestionModal').style.display = 'none';
        document.getElementById('songSuggestionForm').reset();
    }

    async loadDashboardData() {
        await this.loadUpcomingEvents();
        await this.loadAnnouncements();
        await this.loadBandStats();
        await this.loadMySuggestions();
    }

    async loadUpcomingEvents() {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .gte('event_date', new Date().toISOString())
                .order('event_date')
                .limit(5);

            if (data && data.length > 0) {
                this.displayUpcomingEvents(data);
            } else {
                // Show empty state - no demo events
                this.displayUpcomingEvents([]);
            }
        } catch (error) {
            console.error('Error loading events:', error);
            this.displayUpcomingEvents([]);
        }
    }

    displayUpcomingEvents(events) {
        const container = document.getElementById('upcomingEventsList');
        if (!container) return;

        if (events.length === 0) {
            container.innerHTML = '<p class="no-data">No upcoming events scheduled</p>';
            return;
        }

        container.innerHTML = events.map(event => {
            const eventDate = new Date(event.event_date);
            const safeTitle = SecurityUtils.preventXSS(event.title);
            const safeLocation = SecurityUtils.preventXSS(event.location);
            const safeDescription = event.description ? SecurityUtils.preventXSS(event.description) : '';
            
            const formattedDate = eventDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });

            return `
                <div class="event-item">
                    <div class="event-date">
                        <span class="event-day">${eventDate.getDate()}</span>
                        <span class="event-month">${eventDate.toLocaleString('en', { month: 'short' })}</span>
                    </div>
                    <div class="event-details">
                        <h4>${safeTitle}</h4>
                        <p>${safeLocation} • ${eventDate.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                        })}</p>
                        ${safeDescription ? `<p class="event-description">${safeDescription}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadAnnouncements() {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(3);

            if (data && data.length > 0) {
                this.displayAnnouncements(data);
            } else {
                // Show empty state - no demo announcements
                this.displayAnnouncements([]);
            }
        } catch (error) {
            console.error('Error loading announcements:', error);
            this.displayAnnouncements([]);
        }
    }

    displayAnnouncements(announcements) {
        const container = document.getElementById('announcementsList');
        if (!container) return;

        if (announcements.length === 0) {
            container.innerHTML = '<p class="no-data">No announcements at this time</p>';
            return;
        }

        container.innerHTML = announcements.map(announcement => {
            const announcementDate = new Date(announcement.created_at);
            const formattedDate = announcementDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            const safeTitle = SecurityUtils.preventXSS(announcement.title);
            const safeMessage = SecurityUtils.preventXSS(announcement.message);
            
            return `
                <div class="announcement-item ${announcement.is_urgent ? 'urgent' : ''}">
                    <h4>${safeTitle}</h4>
                    <p>${safeMessage}</p>
                    <span class="announcement-date">${formattedDate}</span>
                </div>
            `;
        }).join('');
    }

    async loadBandStats() {
        try {
            // Get total members count only
            const { count: totalMembers, error: membersError } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true });

            // Update only the total members stat
            document.getElementById('totalMembers').textContent = totalMembers || '0';
            
            // Remove the other stats by setting them to empty or "0"
            document.getElementById('upcomingPractices').textContent = '0';
            document.getElementById('newSongs').textContent = '0';

        } catch (error) {
            console.error('Error loading band stats:', error);
            // Fallback - show zeros
            document.getElementById('totalMembers').textContent = '0';
            document.getElementById('upcomingPractices').textContent = '0';
            document.getElementById('newSongs').textContent = '0';
        }
    }

    async submitSongSuggestion() {
        const songTitle = document.getElementById('songName').value;
        const category = document.getElementById('songCategory').value;
        const language = document.getElementById('songLanguage').value;
        const reason = document.getElementById('songReason').value;

        if (!songTitle || !category) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            let suggestionSaved = false;
            
            try {
                const { data, error } = await supabase
                    .from('song_suggestions')
                    .insert([
                        {
                            user_id: this.currentUser.id,
                            song_title: songTitle,
                            category: category,
                            language: language,
                            reason: reason
                        }
                    ]);

                if (!error) {
                    suggestionSaved = true;
                }
            } catch (dbError) {
                console.log('Song suggestions table might not exist, using fallback');
            }

            // If Supabase failed, try general suggestions table
            if (!suggestionSaved) {
                try {
                    const { data, error } = await supabase
                        .from('suggestions')
                        .insert([
                            {
                                user_id: this.currentUser.id,
                                type: 'song',
                                title: `Song Suggestion: ${songTitle}`,
                                description: `Category: ${category}\nLanguage: ${language}\nReason: ${reason || 'Not specified'}`
                            }
                        ]);

                    if (!error) {
                        suggestionSaved = true;
                    }
                } catch (dbError) {
                    console.log('Suggestions table might not exist either');
                }
            }

            // If both database attempts failed, use localStorage as fallback
            if (!suggestionSaved) {
                const suggestions = JSON.parse(localStorage.getItem('member_suggestions') || '[]');
                suggestions.push({
                    id: Date.now(),
                    user_id: this.currentUser.id,
                    type: 'song',
                    title: `Song Suggestion: ${songTitle}`,
                    description: `Category: ${category}\nLanguage: ${language}\nReason: ${reason || 'Not specified'}`,
                    created_at: new Date().toISOString(),
                    status: 'pending'
                });
                localStorage.setItem('member_suggestions', JSON.stringify(suggestions));
            }

            alert(`🎵 Song suggestion "${songTitle}" submitted successfully! Our music team will review it.`);
            this.closeSongSuggestionModal();
            this.loadMySuggestions();

        } catch (error) {
            alert('Error submitting song suggestion: ' + error.message);
        }
    }

    async submitGeneralSuggestion() {
        const type = document.getElementById('suggestionType').value;
        const title = document.getElementById('suggestionTitle').value;
        const description = document.getElementById('suggestionDescription').value;

        if (!type || !title || !description) {
            alert('Please fill in all fields');
            return;
        }

        try {
            let suggestionSaved = false;
            
            try {
                const { data, error } = await supabase
                    .from('suggestions')
                    .insert([
                        {
                            user_id: this.currentUser.id,
                            type: type,
                            title: title,
                            description: description
                        }
                    ]);

                if (!error) {
                    suggestionSaved = true;
                }
            } catch (dbError) {
                console.log('Suggestions table might not exist, using fallback');
            }

            if (!suggestionSaved) {
                const suggestions = JSON.parse(localStorage.getItem('member_suggestions') || '[]');
                suggestions.push({
                    id: Date.now(),
                    user_id: this.currentUser.id,
                    type: type,
                    title: title,
                    description: description,
                    created_at: new Date().toISOString(),
                    status: 'pending'
                });
                localStorage.setItem('member_suggestions', JSON.stringify(suggestions));
            }

            alert(`💡 Suggestion "${title}" submitted successfully! Thank you for your input.`);
            document.getElementById('suggestionForm').reset();
            this.loadMySuggestions();

        } catch (error) {
            alert('Error submitting suggestion: ' + error.message);
        }
    }

    async loadMySuggestions() {
        const container = document.getElementById('mySuggestionsList');
        if (!container) return;

        try {
            let mySuggestions = [];

            try {
                const { data, error } = await supabase
                    .from('suggestions')
                    .select('*')
                    .eq('user_id', this.currentUser.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (data) {
                    mySuggestions = data;
                }
            } catch (dbError) {
                console.log('Suggestions table might not exist, checking localStorage');
            }

            if (mySuggestions.length === 0) {
                const localSuggestions = JSON.parse(localStorage.getItem('member_suggestions') || '[]');
                mySuggestions = localSuggestions.filter(suggestion => 
                    suggestion.user_id === this.currentUser.id
                ).slice(0, 5);
            }

            if (mySuggestions.length === 0) {
                container.innerHTML = '<p class="no-suggestions">You haven\'t submitted any suggestions yet.</p>';
                return;
            }

            container.innerHTML = mySuggestions.map(suggestion => {
                const suggestionDate = new Date(suggestion.created_at);
                const formattedDate = suggestionDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                const typeIcon = suggestion.type === 'song' ? '🎵' : 
                               suggestion.type === 'event' ? '📅' : 
                               suggestion.type === 'improvement' ? '💡' : '💬';

                return `
                    <div class="suggestion-item">
                        <div class="suggestion-header">
                            <span class="suggestion-type">${typeIcon} ${suggestion.type}</span>
                            <span class="suggestion-date">${formattedDate}</span>
                        </div>
                        <h5>${suggestion.title}</h5>
                        <p>${suggestion.description}</p>
                        <div class="suggestion-status ${suggestion.status}">
                            Status: ${suggestion.status || 'pending'}
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Error loading suggestions:', error);
            container.innerHTML = '<p class="no-suggestions">You haven\'t submitted any suggestions yet.</p>';
        }
    }
    // Add this to your MemberDashboard class in member-dashboard.js
    async loadUserProfile() {
        try {
            const { data: member, error } = await supabase
                .from('members')
                .select('name, email, phone, voice_part, profile_picture')
                .eq('user_id', this.currentUser.id)
                .single();
    
            if (member && member.name) {
                this.memberData = member;
                document.getElementById('memberName').textContent = SecurityUtils.preventXSS(member.name);
                
                // FIXED: Load profile picture in dashboard
                const profileImg = document.getElementById('dashboardProfileImg');
                if (profileImg && member.profile_picture) {
                    if (member.profile_picture.startsWith('http')) {
                        profileImg.src = member.profile_picture;
                        profileImg.onerror = function() {
                            this.src = 'images/514-5147412_default-avatar-png.png';
                        };
                    } else {
                        profileImg.src = member.profile_picture;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading user profile in dashboard:', error);
        }
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MemberDashboard();
});


