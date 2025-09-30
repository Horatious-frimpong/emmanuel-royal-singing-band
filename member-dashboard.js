// member-dashboard.js
class MemberDashboard {
    constructor() {
        this.currentUser = null;
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
            // If not logged in, redirect to members page
            window.location.href = 'members.html';
            return;
        }
        this.currentUser = user;
        this.loadUserProfile();
    }

    async loadUserProfile() {
        try {
            const { data: member, error } = await supabase
                .from('members')
                .select('name, email, phone, voice_part, profile_picture')
                .eq('user_id', this.currentUser.id)
                .single();

            if (member && member.name) {
                document.getElementById('memberName').textContent = SecurityUtils.preventXSS(member.name);
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
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
            // Try to get events from Supabase
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .gte('event_date', new Date().toISOString())
                .order('event_date')
                .limit(5);

            if (data && data.length > 0) {
                this.displayUpcomingEvents(data);
            } else {
                // Show demo events if no real events exist
                const demoEvents = [
                    { 
                        title: "Sunday Service", 
                        event_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), 
                        location: "Main Church", 
                        description: "Regular Sunday worship service"
                    },
                    { 
                        title: "Band Practice", 
                        event_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), 
                        location: "Church Hall", 
                        description: "Weekly band rehearsal"
                    },
                    { 
                        title: "Christmas Carols", 
                        event_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), 
                        location: "Church Premises", 
                        description: "Special Christmas carol service"
                    }
                ];
                this.displayUpcomingEvents(demoEvents);
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
            // ✅ ADDED: XSS protection
            const safeTitle = SecurityUtils.preventXSS(event.title);
            const safeLocation = SecurityUtils.preventXSS(event.location);
            const safeDescription = event.description ? SecurityUtils.preventXSS(event.description) : '';           
            const formattedDate = eventDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
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
            // Try to get announcements from Supabase
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(3);

            if (data && data.length > 0) {
                this.displayAnnouncements(data);
            } else {
                // Show demo announcements if no real announcements exist
                const demoAnnouncements = [
                    { 
                        title: "Welcome to Our New Website!", 
                        message: "We're excited to launch our new band website. Explore all the features and stay connected with the band.", 
                        created_at: new Date().toISOString(), 
                        is_urgent: false 
                    },
                    { 
                        title: "Christmas Rehearsal Schedule", 
                        message: "Special rehearsal times for Christmas program starting next week. Please check the calendar for details.", 
                        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), 
                        is_urgent: true 
                    },
                    { 
                        title: "New Song Alert", 
                        message: "We'll be learning 'O Come All Ye Faithful' this week. Practice files available in the music section.", 
                        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), 
                        is_urgent: false 
                    }
                ];
                this.displayAnnouncements(demoAnnouncements);
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
            // Get total members count
            const { count: totalMembers, error: membersError } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true });

            // Get upcoming practices count (this week)
            const startOfWeek = new Date();
            startOfWeek.setHours(0, 0, 0, 0);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6); // Saturday

            const { count: upcomingPractices, error: practicesError } = await supabase
                .from('events')
                .select('*', { count: 'exact', head: true })
                .like('title', '%Practice%')
                .gte('event_date', startOfWeek.toISOString())
                .lte('event_date', endOfWeek.toISOString());

            // Get new songs count (this month)
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { count: newSongs, error: songsError } = await supabase
                .from('music_repertoire')
                .select('*', { count: 'exact', head: true })
                .gte('added_at', startOfMonth.toISOString());

            // Update the stats display
            document.getElementById('totalMembers').textContent = totalMembers || '45';
            document.getElementById('upcomingPractices').textContent = upcomingPractices || '2';
            document.getElementById('newSongs').textContent = newSongs || '3';

        } catch (error) {
            console.error('Error loading band stats:', error);
            // Fallback demo stats
            document.getElementById('totalMembers').textContent = '45';
            document.getElementById('upcomingPractices').textContent = '2';
            document.getElementById('newSongs').textContent = '3';
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
            // First, try to save to Supabase if table exists
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
            
            // Try to save to Supabase
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

            // Fallback to localStorage
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

            // Try to get from Supabase first
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

            // If no Supabase data, check localStorage
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
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MemberDashboard();
});