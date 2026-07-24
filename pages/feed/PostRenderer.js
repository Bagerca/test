// Файл: pages/feed/PostRenderer.js
import { formatRichText } from '../../shared/js/utils.js';
import { translateTextApi } from '../../shared/js/api.js';
import { Logger } from '../../shared/js/Logger.js';

export class PostRenderer {
    constructor(templateId, lightboxManager) {
        this.template = document.getElementById(templateId);
        this.lightbox = lightboxManager;
        this.fallbackAvatar = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="%2365676B" stroke-width="2"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/%3E%3Ccircle cx="12" cy="7" r="4"/%3E%3C/svg%3E';
    }

    // Экранирование для Regex
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Умная подсветка текста
    highlightText(html, searchTerm) {
        if (!searchTerm) return html;
        // Регулярка: ищет слово, ИГНОРИРУЯ всё, что находится внутри HTML тегов <...>
        const regex = new RegExp(`(${this.escapeRegExp(searchTerm)})(?![^<]*>)`, 'gi');
        return html.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    render(post, searchTerm = '') {
        try {
            const clone = this.template.content.cloneNode(true);
            
            clone.querySelector('.post-author-name').textContent = post.authorName;
            
            const rtBadge = clone.querySelector('.rt-badge');
            const rtAuthorLink = clone.querySelector('.rt-author');
            let contentToParse = post.content;
            const rtMatch = post.content.match(/^RT\s+(?:by\s+)?(@[\w_]+)[\s:]+([\s\S]*)$/i);

            if (rtMatch) {
                contentToParse = rtMatch[2].trim();
                rtAuthorLink.textContent = rtMatch[1];
                rtAuthorLink.href = `https://twitter.com/${rtMatch[1].replace('@', '')}`;
                rtBadge.style.display = 'flex';
            }
            
            if (contentToParse.trim().toLowerCase() === 'gif') contentToParse = '';

            // 1. Форматируем ссылки/хэштеги. 2. Подсвечиваем искомое слово
            let richHtml = formatRichText(contentToParse);
            richHtml = this.highlightText(richHtml, searchTerm);
            
            clone.querySelector('.post-text').innerHTML = richHtml;
            
            this.setupActions(clone, contentToParse, post.id);
            this.setupMeta(clone, post);
            this.setupMedia(clone, post);

            return clone;
        } catch (error) { 
            Logger.error(`Ошибка сборки поста ${post.id}`, error);
            return null; 
        }
    }

    setupActions(clone, text, id) {
        const rawText = text.trim();
        const actionsBlock = clone.querySelector('.post-actions');
        
        if (rawText.length === 0) {
            actionsBlock.style.display = 'none';
            return;
        }

        const copyBtn = clone.querySelector('.copy-btn');
        const translateBtn = clone.querySelector('.translate-btn');
        const translationContainer = clone.querySelector('.post-translation');
        const translateTextEl = clone.querySelector('.post-translation-text');

        let isTranslated = false;
        let cachedTranslation = '';

        translateBtn.addEventListener('click', async () => {
            if (isTranslated) {
                translationContainer.style.display = 'none';
                translateBtn.classList.remove('active');
                isTranslated = false;
                return;
            }

            if (cachedTranslation) {
                translationContainer.style.display = 'block';
                translateBtn.classList.add('active');
                isTranslated = true;
                return;
            }

            try {
                translateBtn.classList.add('loading');
                const translated = await translateTextApi(rawText);
                cachedTranslation = formatRichText(translated);
                translateTextEl.innerHTML = cachedTranslation;
                translateTextEl.style.color = "var(--text-main)";
                translationContainer.style.display = 'block';
                translateBtn.classList.replace('loading', 'active');
                isTranslated = true;
            } catch (err) {
                translateBtn.classList.remove('loading');
                translationContainer.style.display = 'block';
                
                if (err.message === 'RATE_LIMIT') {
                    translateTextEl.innerHTML = `<em>Слишком много запросов на перевод. Пожалуйста, подождите немного.</em>`;
                } else {
                    translateTextEl.innerHTML = `<em>Ошибка перевода: сервис временно недоступен.</em>`;
                }
                translateTextEl.style.color = "var(--error-color)";
                isTranslated = true; 
            }
        });

        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(rawText);
                copyBtn.classList.add('success');
                setTimeout(() => copyBtn.classList.remove('success'), 2000);
            } catch (err) {
                Logger.error('Ошибка буфера обмена', err);
            }
        });
    }

    setupMeta(clone, post) {
        const badgeEl = clone.querySelector('.post-platform-badge');
        if (post.platform) badgeEl.textContent = post.platform;
        else badgeEl.style.display = 'none';

        const handleEl = clone.querySelector('.post-author-handle');
        handleEl.textContent = post.authorHandle;
        if (post.platform === 'twitter') handleEl.href = `https://twitter.com/${post.authorHandle.replace('@', '')}`;

        const avatarEl = clone.querySelector('.post-avatar');
        avatarEl.onerror = () => { avatarEl.src = this.fallbackAvatar; avatarEl.classList.add('fallback'); };
        avatarEl.src = post.avatarUrl || this.fallbackAvatar;

        const dateEl = clone.querySelector('.post-date');
        if (post.timestamp) {
            dateEl.textContent = new Date(post.timestamp).toLocaleString('ru-RU', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            dateEl.setAttribute('datetime', post.timestamp);
        }
    }

    setupMedia(clone, post) {
        if (!post.mediaUrl || post.mediaUrl === 'null') return;

        if (post.mediaUrl.match(/\.(mp4|m3u8|webm)/i) || post.mediaUrl.includes('/video/')) {
            const videoEl = clone.querySelector('.video-media');
            videoEl.src = post.mediaUrl;
            videoEl.style.display = 'block';
        } else {
            const imgEl = clone.querySelector('.img-media');
            imgEl.src = post.mediaUrl;
            imgEl.style.display = 'block';
            imgEl.addEventListener('click', () => this.lightbox.open(post.mediaUrl));
            imgEl.onerror = () => imgEl.style.display = 'none';
        }
    }
}