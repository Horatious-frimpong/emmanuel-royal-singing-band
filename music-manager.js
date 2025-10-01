// music-manager.js
class MusicManager {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadMusicRepertoire();
    }

    async loadMusicRepertoire() {
        try {
            const { data, error } = await supabase
                .from('music_repertoire')
                .select('*')
                .eq('is_active', true)
                .order('title');

            if (data) {
                this.displayMusicRepertoire(data);
            } else {
                // Show empty state if no songs
                this.displayEmptyState();
            }
        } catch (error) {
            console.error('Error loading music repertoire:', error);
            this.displayEmptyState();
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

        // Group songs by category
        songs.forEach(song => {
            if (categories[song.category]) {
                categories[song.category].push(song);
            }
        });

        let html = '';
        let hasSongs = false;
        
        Object.entries(categories).forEach(([category, songs]) => {
            if (songs.length > 0) {
                hasSongs = true;
                html += `
                    <div class="music-category">
                        <h3>🎵 ${category}</h3>
                        <div class="song-list">
                `;
                
                songs.forEach(song => {
                    const languageBadge = song.language !== 'English' ? 
                        ` <span class="language-badge">${song.language}</span>` : '';
                    html += `<div class="song-item">"${song.title}"${languageBadge}</div>`;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }
        });

        if (!hasSongs) {
            this.displayEmptyState();
        } else {
            repertoireContainer.innerHTML = html;
        }
    }

    displayEmptyState() {
        const repertoireContainer = document.getElementById('musicRepertoire');
        if (!repertoireContainer) return;

        repertoireContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎵</div>
                <h3>No Songs Added Yet</h3>
                <p>Our music repertoire is currently empty. Band leaders can add songs through the admin dashboard.</p>
                <div class="empty-categories">
                    <div class="empty-category">
                        <h4>Methodist Anthems & Traditional Hymns</h4>
                        <p>No songs in this category yet</p>
                    </div>
                    <div class="empty-category">
                        <h4>Ghanaian Highlife & Contemporary Worship</h4>
                        <p>No songs in this category yet</p>
                    </div>
                    <div class="empty-category">
                        <h4>Choir Specials & Seasonal Songs</h4>
                        <p>No songs in this category yet</p>
                    </div>
                    <div class="empty-category">
                        <h4>Local Compositions & Original Songs</h4>
                        <p>No songs in this category yet</p>
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MusicManager();
});
