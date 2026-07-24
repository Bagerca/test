import { SiteHeader } from '../../shared/js/components/SiteHeader.js';
import { fetchData } from '../../shared/js/api.js';
import { LightboxManager } from '../../shared/js/Lightbox.js';
import { LibraryManager } from './LibraryManager.js';

customElements.define('site-header', SiteHeader);

document.addEventListener('DOMContentLoaded', async () => {
    // Инициализируем Lightbox для скриншотов
    const lightbox = new LightboxManager('lightbox', 'lightbox-img');
    
    // Передаем lightbox в библиотеку
    const library = new LibraryManager(lightbox);

    try {
        const games = await fetchData('data/games.json'); 
        library.render(games);
    } catch (error) {
        library.showError('Сбой доступа к архивам Joey Drew Studios.');
    }
});