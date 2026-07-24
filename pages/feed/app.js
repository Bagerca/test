// Файл: pages/feed/app.js
import { SiteHeader } from '../../shared/js/components/SiteHeader.js';
import { fetchData } from '../../shared/js/api.js';
import { debounce } from '../../shared/js/utils.js';
import { LightboxManager } from '../../shared/js/Lightbox.js';
import { PostRenderer } from './PostRenderer.js';
import { FeedManager } from './FeedManager.js';
import { CustomSelect } from './CustomSelect.js';

// Регистрируем веб-компонент шапки
customElements.define('site-header', SiteHeader);

document.addEventListener('DOMContentLoaded', async () => {
    console.info('[FeedApp] Инициализация ленты...');
    
    const lightbox = new LightboxManager('lightbox', 'lightbox-img');
    const renderer = new PostRenderer('post-template', lightbox);
    const feed = new FeedManager('feed-content', 'scroll-sentinel', renderer);

    const searchInput = document.getElementById('search-input');
    let currentSelectedAuthor = 'all';

    const authorSelect = new CustomSelect('author-filter-container', (selected) => {
        currentSelectedAuthor = selected;
        feed.applyFilters(searchInput.value, currentSelectedAuthor);
    });

    try {
        const data = await fetchData('data/feed.json'); 
        if (!data || data.length === 0) throw new Error("Empty Feed");

        const uniqueAuthors = Array.from(new Map(data.map(p => [p.authorHandle, {
            handle: p.authorHandle, name: p.authorName, avatarUrl: p.avatarUrl
        }])).values());
        
        authorSelect.populate(uniqueAuthors);
        feed.setPosts(data);

        // УВЕЛИЧЕН DEBOUNCE ДО 500мс для более плавного UX
        searchInput.addEventListener('input', debounce(() => {
            feed.applyFilters(searchInput.value, currentSelectedAuthor);
        }, 500));

    } catch (error) {
        feed.showError('Не удалось загрузить ленту. База данных недоступна.');
    }
});