// Файл: pages/feed/FeedManager.js
export class FeedManager {
    constructor(containerId, sentinelId, renderer) {
        this.container = document.getElementById(containerId);
        this.sentinel = document.getElementById(sentinelId);
        this.renderer = renderer;
        
        this.allPosts = [];
        this.filteredPosts = [];
        this.chunkSize = 20;
        this.currentIndex = 0;

        this.initObserver();
    }

    setPosts(posts) {
        this.allPosts = posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        this.applyFilters('', 'all');
    }

    applyFilters(searchTerm, selectedAuthor) {
        const term = searchTerm.toLowerCase().trim();
        this.filteredPosts = this.allPosts.filter(post => {
            const matchAuthor = selectedAuthor === 'all' || post.authorHandle === selectedAuthor;
            const matchSearch = term === '' || post.content.toLowerCase().includes(term) || post.authorName.toLowerCase().includes(term);
            return matchAuthor && matchSearch;
        });

        this.container.innerHTML = '';
        this.currentIndex = 0;

        // КРАСИВОЕ СОСТОЯНИЕ "НИЧЕГО НЕ НАЙДЕНО"
        if (this.filteredPosts.length === 0) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            <path d="M11 8v2"></path>
                            <path d="M11 14h.01"></path>
                        </svg>
                    </div>
                    <h3 class="empty-state-title">Ничего не найдено</h3>
                    <p class="empty-state-desc">Попробуйте изменить поисковой запрос или выбрать другого автора.</p>
                </div>
            `;
            this.sentinel.classList.remove('active');
            return;
        }

        this.renderNextChunk();
    }

    initObserver() {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) this.renderNextChunk();
        }, { rootMargin: '200px' });
        observer.observe(this.sentinel);
    }

    renderNextChunk() {
        if (this.currentIndex >= this.filteredPosts.length) {
            this.sentinel.classList.remove('active');
            return;
        }

        this.sentinel.classList.add('active');
        const chunk = this.filteredPosts.slice(this.currentIndex, this.currentIndex + this.chunkSize);
        const fragment = document.createDocumentFragment();

        chunk.forEach(post => {
            const el = this.renderer.render(post);
            if (el) fragment.appendChild(el);
        });

        this.container.appendChild(fragment);
        this.currentIndex += this.chunkSize;

        if (this.currentIndex >= this.filteredPosts.length) {
            this.sentinel.classList.remove('active');
        }
    }

    showError(msg) {
        this.container.innerHTML = `<div class="error-card"><p>${msg}</p></div>`;
        this.sentinel.classList.remove('active');
    }
}