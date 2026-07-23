import { formatRichText } from './parser.js';

export class FeedManager {
    constructor(config) {
        this.container = document.getElementById(config.containerId);
        this.template = document.getElementById(config.templateId);
        this.sentinel = document.getElementById('scroll-sentinel');
        this.lightboxManager = config.lightboxManager;
        
        this.allPosts = [];
        this.filteredPosts = [];
        
        // Настройки бесконечного скролла
        this.chunkSize = 20; // Количество постов за одну подгрузку
        this.currentIndex = 0;
        
        this.fallbackAvatar = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2365676B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E';

        this.initObserver();
    }

    setPosts(posts) {
        // Сортируем новые к старым
        this.allPosts = posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        this.applyFilters('', 'all'); // Рендерим начальное состояние
    }

    applyFilters(searchTerm, selectedAuthor) {
        const term = searchTerm.toLowerCase().trim();

        this.filteredPosts = this.allPosts.filter(post => {
            const matchesAuthor = selectedAuthor === 'all' || post.authorHandle === selectedAuthor;
            const matchesSearch = term === '' || 
                                  post.content.toLowerCase().includes(term) || 
                                  post.authorName.toLowerCase().includes(term);
            return matchesAuthor && matchesSearch;
        });

        // Сброс состояния ленты
        this.container.innerHTML = '';
        this.currentIndex = 0;

        if (this.filteredPosts.length === 0) {
            this.container.innerHTML = `<div class="loading-state">По запросу ничего не найдено 🕵️</div>`;
            this.sentinel.classList.remove('active');
            return;
        }

        this.renderNextChunk();
    }

    initObserver() {
        // Настройка Intersection Observer для бесконечного скролла
        const options = {
            root: null,
            rootMargin: '200px', // Начинать загрузку за 200px до конца ленты
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                this.renderNextChunk();
            }
        }, options);

        observer.observe(this.sentinel);
    }

    renderNextChunk() {
        // Если все посты отрендерены, скрываем лоадер
        if (this.currentIndex >= this.filteredPosts.length) {
            this.sentinel.classList.remove('active');
            return;
        }

        this.sentinel.classList.add('active');

        // Вырезаем следующую порцию (чанк)
        const chunk = this.filteredPosts.slice(this.currentIndex, this.currentIndex + this.chunkSize);
        const fragment = document.createDocumentFragment();

        chunk.forEach(post => {
            const el = this.createPostElement(post);
            if (el) fragment.appendChild(el);
        });

        this.container.appendChild(fragment);
        this.currentIndex += this.chunkSize;

        // Если это был последний чанк, сразу скрываем сентинел
        if (this.currentIndex >= this.filteredPosts.length) {
            this.sentinel.classList.remove('active');
        }
    }

    createPostElement(post) {
        try {
            const clone = this.template.content.cloneNode(true);
            
            clone.querySelector('.post-author-name').textContent = post.authorName;
            
            // --- ОБРАБОТКА РЕТВИТОВ ---
            const rtBadge = clone.querySelector('.rt-badge');
            const rtAuthorLink = clone.querySelector('.rt-author');
            let contentToParse = post.content;

            // Регулярка ищет паттерны: "RT @name:" или "RT by @name:"
            const rtRegex = /^RT\s+(?:by\s+)?(@[\w_]+)[\s:]+([\s\S]*)$/i;
            const rtMatch = post.content.match(rtRegex);

            if (rtMatch) {
                const originalAuthor = rtMatch[1]; // Извлекаем @никнейм
                contentToParse = rtMatch[2].trim(); // Забираем только сам текст поста

                rtAuthorLink.textContent = originalAuthor;
                rtAuthorLink.href = `https://twitter.com/${originalAuthor.replace('@', '')}`;
                rtBadge.style.display = 'flex'; // Показываем плашку
            }
            
            // --- УБИРАЕМ СЛОВО "Gif" ---
            if (contentToParse.trim().toLowerCase() === 'gif') {
                contentToParse = '';
            }
            // --------------------------

            // Рендерим очищенный текст
            clone.querySelector('.post-text').innerHTML = formatRichText(contentToParse);
            
            // --- КНОПКИ ДЕЙСТВИЙ (Копировать / Перевести) ---
            const rawTextForActions = contentToParse.trim();
            const postActionsBlock = clone.querySelector('.post-actions');
            
            if (rawTextForActions.length > 0) {
                const copyBtn = clone.querySelector('.copy-btn');
                const translateBtn = clone.querySelector('.translate-btn');

                // 1. Ссылка на Google Translate
                translateBtn.href = `https://translate.google.com/?sl=en&tl=ru&text=${encodeURIComponent(rawTextForActions)}&op=translate`;

                // 2. Логика копирования
                copyBtn.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(rawTextForActions);
                        
                        // Анимация успеха (меняем иконку на зеленую галочку)
                        const originalHTML = copyBtn.innerHTML;
                        copyBtn.classList.add('success');
                        copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                        
                        // Возвращаем как было через 2 секунды
                        setTimeout(() => {
                            copyBtn.classList.remove('success');
                            copyBtn.innerHTML = originalHTML;
                        }, 2000);
                    } catch (err) {
                        console.error('Не удалось скопировать текст: ', err);
                    }
                });
            } else {
                // Если текста нет (пост состоит только из картинки/гифки), прячем кнопки
                postActionsBlock.style.display = 'none';
            }
            // ------------------------------------------------
            
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
                avatarEl.classList.add('fallback');
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

            // --- ОБРАБОТКА МЕДИА (Картинки vs Видео/GIF) ---
            if (post.mediaUrl && post.mediaUrl !== 'null') {
                const isVideo = post.mediaUrl.match(/\.(mp4|m3u8|webm)/i) || post.mediaUrl.includes('/video/');
                
                if (isVideo) {
                    const videoEl = clone.querySelector('.video-media');
                    videoEl.src = post.mediaUrl;
                    videoEl.style.display = 'block';
                } else {
                    const imgEl = clone.querySelector('.img-media');
                    imgEl.src = post.mediaUrl;
                    imgEl.style.display = 'block';
                    imgEl.addEventListener('click', () => this.lightboxManager.open(post.mediaUrl));
                    imgEl.onerror = () => { imgEl.style.display = 'none'; };
                }
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
        this.sentinel.classList.remove('active');
    }
}