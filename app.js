/**
 * Управление лентой постов разработчиков.
 * Архитектура: Модульный класс с обработкой ошибок и логированием.
 */
class BendyFeedManager {
    constructor(config) {
        this.feedUrl = config.feedUrl;
        this.containerId = config.containerId;
        this.templateId = config.templateId;
        
        // Кэшируем DOM элементы для оптимизации
        this.container = document.getElementById(this.containerId);
        this.template = document.getElementById(this.templateId);
        
        // Логируем инициализацию
        console.group('BendyFeedManager Init');
        console.info(`Feed URL: ${this.feedUrl}`);
        console.info(`Container found: ${!!this.container}`);
        console.info(`Template found: ${!!this.template}`);
        console.groupEnd();

        // Защита от критических ошибок в HTML
        if (!this.container || !this.template) {
            console.error('[Критическая ошибка] Не найден контейнер или шаблон в HTML!');
            return;
        }
    }

    /**
     * Точка входа. Запускает процесс получения и отрисовки данных.
     */
    async init() {
        try {
            const data = await this.fetchFeedData();
            
            // Если данные пришли пустые или не массив
            if (!Array.isArray(data) || data.length === 0) {
                this.showError('В архивах пока пусто. Попробуйте зайти позже.');
                return;
            }

            this.renderFeed(data);
            
        } catch (error) {
            console.error('[Ошибка инициализации ленты]', error);
            this.showError('Чернильная машина заклинила. Не удалось загрузить архивы.');
        }
    }

    /**
     * Асинхронно скачивает JSON файл с постами
     */
    async fetchFeedData() {
        console.log(`[Network] Запрашиваем данные из: ${this.feedUrl}`);
        
        const response = await fetch(this.feedUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`[Network] Успешно получено постов: ${data.length}`);
        
        return data;
    }

    /**
     * Очищает контейнер и рендерит список постов
     * @param {Array} posts - Массив объектов постов
     */
    renderFeed(posts) {
        // Очищаем индикатор загрузки
        this.container.innerHTML = '';
        
        // Используем DocumentFragment для оптимизации (одна вставка в DOM вместо множества)
        const fragment = document.createDocumentFragment();

        posts.forEach(postData => {
            const postElement = this.createPostElement(postData);
            if (postElement) {
                fragment.appendChild(postElement);
            }
        });

        this.container.appendChild(fragment);
        console.info('[UI] Рендеринг ленты завершен');
    }

    /**
     * Создает DOM-узел одного поста на основе шаблона
     * @param {Object} post - Данные поста
     * @returns {DocumentFragment}
     */
    createPostElement(post) {
        try {
            // Клонируем содержимое тега <template>
            const clone = this.template.content.cloneNode(true);
            
            // Заполняем текстовые данные
            clone.querySelector('.post-author-name').textContent = post.authorName || 'Неизвестный';
            clone.querySelector('.post-text').textContent = post.content || '';
            
            // Заполняем ссылки и хэндл
            const handleEl = clone.querySelector('.post-author-handle');
            handleEl.textContent = post.authorHandle || '';
            if (post.platform === 'twitter') {
                handleEl.href = `https://twitter.com/${post.authorHandle.replace('@', '')}`;
            }

            // Аватарка
            const avatarEl = clone.querySelector('.post-avatar');
            if (post.avatarUrl) {
                avatarEl.src = post.avatarUrl;
            } else {
                // Заглушка, если аватара нет
                avatarEl.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="%23111"/></svg>';
            }

            // Форматирование даты (локализуем под пользователя)
            const dateEl = clone.querySelector('.post-date');
            if (post.timestamp) {
                const dateObj = new Date(post.timestamp);
                dateEl.datetime = post.timestamp;
                dateEl.textContent = new Intl.DateTimeFormat('ru-RU', {
                    day: 'numeric', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }).format(dateObj);
            }

            // Медиа (картинка поста)
            const mediaEl = clone.querySelector('.post-media');
            if (post.mediaUrl && post.mediaUrl !== 'null') {
                mediaEl.src = post.mediaUrl;
                mediaEl.style.display = 'block'; // Показываем, так как по умолчанию скрыто
            }

            return clone;
            
        } catch (error) {
            console.error(`[Ошибка сборки поста id:${post.id}]`, error);
            return null; // В случае ошибки одного поста, возвращаем null, чтобы лента не сломалась целиком
        }
    }

    /**
     * Отображает сообщение об ошибке на экране
     */
    showError(message) {
        this.container.innerHTML = `
            <div class="post-card" style="text-align: center; color: red;">
                <h3>⚠️ Ошибка связи</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

// ==========================================================================
// Инициализация приложения после загрузки DOM
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const feed = new BendyFeedManager({
        feedUrl: './feed.json', // Путь к нашему локальному файлу
        containerId: 'feed-container',
        templateId: 'post-template'
    });
    
    feed.init();
});