import { fetchFeedData } from './api.js';
import { debounce } from './parser.js';
import { ThemeManager, LightboxManager } from './ui.js';
import { FeedManager } from './feed.js';
import { CustomSelect } from './customSelect.js'; // Подключаем новый модуль

document.addEventListener('DOMContentLoaded', async () => {
    
    // Инициализация базовых UI менеджеров
    new ThemeManager('theme-toggle');
    const lightbox = new LightboxManager('lightbox', 'lightbox-img');

    // Инициализация менеджера ленты
    const feed = new FeedManager({
        containerId: 'feed-content',
        templateId: 'post-template',
        lightboxManager: lightbox
    });

    const searchInput = document.getElementById('search-input');
    
    // Переменная для хранения текущего выбранного автора
    let currentSelectedAuthor = 'all';

    // Инициализация нашего кастомного селекта
    const authorSelect = new CustomSelect('author-filter-container', (selectedValue) => {
        currentSelectedAuthor = selectedValue;
        feed.applyFilters(searchInput.value, currentSelectedAuthor);
    });

    try {
        const data = await fetchFeedData('./feed.json');
        
        if (!data || data.length === 0) {
            feed.showError('Лента пуста или данные еще не собраны.');
            return;
        }

        // Извлекаем уникальных авторов И их актуальные аватарки
        const uniqueAuthors = extractUniqueAuthorsWithAvatars(data);
        
        // Заполняем кастомный выпадающий список
        authorSelect.populate(uniqueAuthors);

        // Загружаем данные в ленту
        feed.setPosts(data);

        // Поиск с Debounce
        searchInput.addEventListener('input', debounce(() => {
            feed.applyFilters(searchInput.value, currentSelectedAuthor);
        }, 300));

    } catch (error) {
        feed.showError('Не удалось загрузить ленту. Проверьте подключение к сети.');
    }
});

// Умная функция, которая находит уникальных авторов и берет их самую свежую аватарку
function extractUniqueAuthorsWithAvatars(posts) {
    const authorsMap = new Map();
    
    posts.forEach(post => {
        // Так как лента отсортирована от новых к старым, 
        // первая встреченная аватарка автора будет самой актуальной
        if (!authorsMap.has(post.authorHandle)) {
            authorsMap.set(post.authorHandle, {
                handle: post.authorHandle,
                name: post.authorName,
                avatarUrl: post.avatarUrl
            });
        }
    });

    return Array.from(authorsMap.values());
}