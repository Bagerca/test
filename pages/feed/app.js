// Файл: pages/feed/app.js
import { SiteHeader } from '../../shared/js/components/SiteHeader.js';
import { fetchData } from '../../shared/js/api.js';
import { LightboxManager } from '../../shared/js/Lightbox.js';
import { PostRenderer } from './PostRenderer.js';
import { FeedManager } from './FeedManager.js';
import { CustomSelect } from './CustomSelect.js';

customElements.define('site-header', SiteHeader);

document.addEventListener('DOMContentLoaded', async () => {
    console.info('[FeedApp] Инициализация ленты...');
    
    const lightbox = new LightboxManager('lightbox', 'lightbox-img');
    const renderer = new PostRenderer('post-template', lightbox);
    const feed = new FeedManager('feed-content', 'scroll-sentinel', renderer);

    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    let currentSelectedAuthor = 'all';

    const executeSearch = () => {
        feed.applyFilters(searchInput.value, currentSelectedAuthor);
    };

    const authorSelect = new CustomSelect('author-filter-container', (selected) => {
        currentSelectedAuthor = selected;
        executeSearch(); // При смене автора фильтруем сразу
    });

    try {
        const data = await fetchData('data/feed.json'); 
        if (!data || data.length === 0) throw new Error("Empty Feed");

        const uniqueAuthors = Array.from(new Map(data.map(p => [p.authorHandle, {
            handle: p.authorHandle, name: p.authorName, avatarUrl: p.avatarUrl
        }])).values());
        
        authorSelect.populate(uniqueAuthors);
        feed.setPosts(data);

        // Поиск по нажатию Enter
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeSearch();
            }
        });

        // Поиск по клику на лупу
        searchBtn.addEventListener('click', () => {
            executeSearch();
        });

    } catch (error) {
        feed.showError('Не удалось загрузить ленту. База данных недоступна.');
    }
});