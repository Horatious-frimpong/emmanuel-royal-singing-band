// gallery-manager.js
class GalleryManager {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadGallery();
    }

    async loadGallery() {
        try {
            const { data, error } = await supabase
                .from('gallery_photos')
                .select('*')
                .eq('is_active', true)
                .order('uploaded_at', { ascending: false });

            if (data) {
                this.displayGallery(data);
            } else {
                this.displayEmptyGallery();
            }
        } catch (error) {
            console.error('Error loading gallery:', error);
            this.displayEmptyGallery();
        }
    }

    displayGallery(photos) {
        const container = document.getElementById('galleryContainer');
        if (!container) return;

        if (photos.length === 0) {
            this.displayEmptyGallery();
            return;
        }

        container.innerHTML = photos.map(photo => `
            <div class="gallery-item">
                <img src="${photo.image_url}" alt="${photo.description || 'Band photo'}" 
                     onerror="this.src='images/514-5147412_default-avatar-png.png'">
                <p>${photo.description || 'Band Memory'}</p>
                <small>${new Date(photo.uploaded_at).toLocaleDateString()}</small>
            </div>
        `).join('');
    }

    displayEmptyGallery() {
        const container = document.getElementById('galleryContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-gallery">
                <div class="empty-icon">📸</div>
                <h4>No Photos Yet</h4>
                <p>Our leaders will add photos soon!</p>
            </div>
        `;
    }
}

// Initialize gallery when page loads
document.addEventListener('DOMContentLoaded', () => {
    new GalleryManager();
});