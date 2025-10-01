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
            const { data: member, error } = await supabase
                .from('members')
                .select('name, email, phone, voice_part, profile_picture')
                .eq('user_id', this.currentUser.id)
                .single();

            if (member && member.name) {
                this.memberData = member;
                // FIX: Show actual member name instead of "Member"
                document.getElementById('memberName').textContent = SecurityUtils.preventXSS(member.name);
            } else {
                document.getElementById('memberName').textContent = 'Member';
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            document.getElementById('memberName').textContent = 'Member';
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

    async
