import { Logger } from '../../shared/js/Logger.js';
import { getAverageRGB } from '../../shared/js/utils.js';
import { GameModal } from './GameModal.js';

export class LibraryManager {
    constructor(lightboxManager) {
        this.container = document.getElementById('games-content');
        this.loader = document.getElementById('games-loader');
        this.template = document.getElementById('game-card-template');
        this.modal = new GameModal('game-modal', lightboxManager);
        this.baseAssetPath = 'assets/games/';
    }

    determineStatus(releaseDate) {
        if (!releaseDate) return { text: 'В разработке', class: 'status-dev' };
        
        const lowerDate = releaseDate.toLowerCase();
        if (lowerDate.includes('скоро') || lowerDate.includes('не объявлена') || lowerDate.includes('2025')) {
            return { text: 'В разработке', class: 'status-dev' };
        }
        return { text: 'Вышла', class: 'status-released' };
    }

    render(games) {
        const fragment = document.createDocumentFragment();

        games.forEach(game => {
            const clone = this.template.content.cloneNode(true);
            const card = clone.querySelector('.game-card');
            
            clone.querySelector('.game-title').textContent = game.title;
            clone.querySelector('.game-year').textContent = game.release_date || '';
            
            const badge = clone.querySelector('.game-status-badge');
            const statusConfig = this.determineStatus(game.release_date);
            badge.textContent = statusConfig.text;
            badge.classList.add(statusConfig.class);

            const imgEl = clone.querySelector('.game-cover-img');
            const fallbackEl = clone.querySelector('.game-cover-fallback');

            // УМНАЯ ЛОГИКА: Сначала берем баннер (идеально для широкой карточки). 
            // Если баннера нет - берем постер (cover).
            const cardImageFile = (game.assets && game.assets.banner) 
                ? game.assets.banner 
                : (game.assets && game.assets.cover);

            if (cardImageFile) {
                const imgSrc = `${this.baseAssetPath}${cardImageFile}`;
                imgEl.src = imgSrc;
                imgEl.alt = game.title;
                fallbackEl.style.display = 'none';
                
                // Извлекаем цвет из баннера для красивого свечения при наведении
                getAverageRGB(imgSrc, (color) => {
                    if (color) {
                        card.style.setProperty('--card-hover-rgb', color);
                    } else {
                        // Дефолтный золотой цвет Bendy при ошибке
                        card.style.setProperty('--card-hover-rgb', '210, 168, 80');
                    }
                });

                imgEl.onerror = () => {
                    imgEl.style.display = 'none';
                    fallbackEl.style.display = 'flex';
                };
            } else {
                imgEl.style.display = 'none';
                fallbackEl.style.display = 'flex';
            }

            card.addEventListener('click', () => {
                this.modal.open(game);
            });

            fragment.appendChild(clone);
        });

        this.loader.style.display = 'none';
        this.container.appendChild(fragment);
        this.container.style.display = 'grid';
        Logger.info('Библиотека игр успешно отрендерена');
    }

    showError(msg) {
        this.loader.style.display = 'none';
        this.container.innerHTML = `<div class="error-card" style="grid-column: 1/-1"><p>${msg}</p></div>`;
        this.container.style.display = 'block';
        Logger.error('Ошибка рендеринга библиотеки:', msg);
    }
}