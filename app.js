class BendyFeedManager {
    constructor(config) {
        this.feedUrl = config.feedUrl;
        this.container = document.getElementById(config.containerId);
        this.template = document.getElementById(config.templateId);
        
        // Управление UI
        this.searchInput = document.getElementById('search-input');
        this.authorFilter = document.getElementById('author-filter');
        this.themeToggle = document.getElementById('theme-toggle');
        
        // Lightbox
        this.lightbox = document.getElementById('lightbox');
        this.lightboxImg = document.getElementById('lightbox-img');
        
        this.allPosts = [];
        this.fallbackAvatar = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2365676B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E';
    }

    async init() {
        this.initTheme();
        this.initLightbox();

        try {
            this.allPosts = await this.fetchFeedData();
            
            if (!this.allPosts || this.allPosts.length === 0) {
                this.showError('Лента пуста или данные еще не собраны.');
                return;
            }

            // ПРИНУДИТЕЛЬНАЯ КЛИЕНТСКАЯ СОРТИРОВКА
            this.allPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            this.populateAuthorsDropdown();
            this.renderFeed(this.allPosts);
            this.setupEventListeners();
            
        } catch (error) {
            console.error('[FeedManager Error]', error);
            this.showError('Не удалось загрузить ленту. Проверьте подключение к сети.');
        }
    }

    // =======================================================
    // ТЁМНАЯ ТЕМА (Dark Mode)
    // =======================================================
    initTheme() {
        const savedTheme = localStorage.getItem('bendy-theme') || 'dark';
        this.updateThemeIcon(savedTheme);

        this.themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('bendy-theme', newTheme);
            this.updateThemeIcon(newTheme);
        });
    }

    updateThemeIcon(theme) {
        const sun = this.themeToggle.querySelector('.icon-sun');
        const moon = this.themeToggle.querySelector('.icon-moon');
        if (theme === 'dark') {
            sun.style.display = 'block';
            moon.style.display = 'none';
        } else {
            sun.style.display = 'none';
            moon.style.display = 'block';
        }
    }

    // =======================================================
    // LIGHTBOX (Галерея)
    // =======================================================
    initLightbox() {
        this.lightbox.addEventListener('click', (e) => {
            if (e.target !== this.lightboxImg) {
                this.lightbox.classList.remove('active');
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.lightbox.classList.remove('active');
        });
    }

    openLightbox(imgSrc) {
        this.lightboxImg.src = imgSrc;
        this.lightbox.classList.add('active');
    }

    // =======================================================
    // ДАННЫЕ
    // =======================================================
    async fetchFeedData() {
        const response = await fetch(`${this.feedUrl}?t=${new Date().getTime()}`, {
            cache: 'no-store'
        });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        return await response.json();
    }

    populateAuthorsDropdown() {
        const uniqueAuthors = [...new Set(this.allPosts.map(post => post.authorHandle))];
        
        uniqueAuthors.forEach(handle => {
            const option = document.createElement('option');
            option.value = handle;
            option.textContent = handle;
            this.authorFilter.appendChild(option);
        });
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    setupEventListeners() {
        const debouncedFilter = this.debounce(() => this.applyFilters(), 300);
        this.searchInput.addEventListener('input', debouncedFilter);
        this.authorFilter.addEventListener('change', () => this.applyFilters());
    }

    applyFilters() {
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        const selectedAuthor = this.authorFilter.value;

        const filteredPosts = this.allPosts.filter(post => {
            const matchesAuthor = selectedAuthor === 'all' || post.authorHandle === selectedAuthor;
            const matchesSearch = searchTerm === '' || 
                                  post.content.toLowerCase().includes(searchTerm) || 
                                  post.authorName.toLowerCase().includes(searchTerm);

            return matchesAuthor && matchesSearch;
        });

        this.renderFeed(filteredPosts);
    }

    // =======================================================
    // РЕНДЕР И ПАРСИНГ
    // =======================================================
    
    // Бронебойный парсер с защитой от двойного экранирования и XSS
    formatRichText(text) {
        if (!text) return '';

        // 1. Рекурсивно декодируем текст через DOMParser.
        // Это уничтожит любое двойное/тройное экранирование (I&amp;#39;m -> I&#39;m -> I'm)
        let decodedText = text;
        const parser = new DOMParser();
        for (let i = 0; i < 3; i++) {
            const doc = parser.parseFromString(decodedText, "text/html");
            decodedText = doc.documentElement.textContent;
        }

        // 2. Безопасно экранируем чистый текст через браузерный механизм
        // <script> станет &lt;script&gt;, а обычные апострофы (') останутся нетронутыми
        const div = document.createElement('div');
        div.textContent = decodedText;
        let safeHtml = div.innerHTML;

        // 3. Расставляем кликабельные ссылки (исключаем попадание HTML тегов внутрь ссылок)
        const urlRegex = /(https?:\/\/[^\s<]+)/g;
        safeHtml = safeHtml.replace(urlRegex, '<a href="$1" class="rich-link" target="_blank" rel="noopener noreferrer">$1</a>');

        // 4. Расставляем хэштеги
        const hashtagRegex = /#(\w+)/g;
        safeHtml = safeHtml.replace(hashtagRegex, '<a href="https://twitter.com/hashtag/$1" class="rich-link" target="_blank" rel="noopener noreferrer">#$1</a>');

        // 5. Расставляем упоминания
        const mentionRegex = /@(\w+)/g;
        safeHtml = safeHtml.replace(mentionRegex, '<a href="https://twitter.com/$1" class="rich-link" target="_blank" rel="noopener noreferrer">@$1</a>');

        return safeHtml;
    }

    renderFeed(posts) {
        this.container.innerHTML = ''; 
        
        if (posts.length === 0) {
            this.container.innerHTML = `<div class="loading-state">По запросу ничего не найдено 🕵️</div>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        posts.forEach(post => {
            const el = this.createPostElement(post);
            if (el) fragment.appendChild(el);
        });
        
        this.container.appendChild(fragment);
    }

    createPostElement(post) {
        try {
            const clone = this.template.content.cloneNode(true);
            
            clone.querySelector('.post-author-name').textContent = post.authorName;
            
            // Вставляем наш очищенный и распарсенный текст
            clone.querySelector('.post-text').innerHTML = this.formatRichText(post.content);
            
            const badgeEl = clone.querySelector('.post-platform-badge');
            if (post.platform) badgeEl.textContent = post.platform;
            else badgeEl.style.display = 'none';

            const handleEl = clone.querySelector('.post-author-handle');
            handleEl.textContent = post.authorHandle;
            
            const cleanHandle = post.authorHandle.replace('@', '');
            if (post.platform === 'twitter') {
                handleEl.href = `https://twitter.com/${cleanHandle}`;
            } else if (post.platform === 'bluesky') {
                handleEl.href = `https://bsky.app/profile/${cleanHandle}`;
            } else {
                handleEl.removeAttribute('href');
            }

            const avatarEl = clone.querySelector('.post-avatar');
            avatarEl.onerror = () => { 
                avatarEl.onerror = null; 
                avatarEl.src = this.fallbackAvatar; 
                avatarEl.style.padding = '8px'; 
            };
            avatarEl.src = post.avatarUrl || this.fallbackAvatar;

            const dateEl = clone.querySelector('.post-date');
            if (post.timestamp) {
                const dateObj = new Date(post.timestamp);
                dateEl.textContent = dateObj.toLocaleString('ru-RU', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
                dateEl.setAttribute('datetime', post.timestamp);
            }

            const mediaEl = clone.querySelector('.post-media');
            if (post.mediaUrl && post.mediaUrl !== 'null') {
                mediaEl.src = post.mediaUrl;
                mediaEl.style.display = 'block';
                
                // Галерея
                mediaEl.addEventListener('click', () => this.openLightbox(post.mediaUrl));
                mediaEl.onerror = () => { mediaEl.style.display = 'none'; };
            }

            return clone;
        } catch (error) { 
            console.warn('[Post Render Error]', error, post);
            return null; 
        }
    }

    showError(msg) {
        this.container.innerHTML = `
            <div class="post-card error-card">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <p>${msg}</p>
            </div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const feed = new BendyFeedManager({
        feedUrl: './feed.json',
        containerId: 'feed-content',
        templateId: 'post-template'
    });
    feed.init();
});