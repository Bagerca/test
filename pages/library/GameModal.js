export class GameModal {
    constructor(modalId, lightboxManager) {
        this.modal = document.getElementById(modalId);
        this.lightbox = lightboxManager;
        this.closeBtn = this.modal.querySelector('.modal-close');
        this.baseAssetPath = 'assets/games/';
        
        this.els = {
            bg: document.getElementById('modal-dynamic-bg'),
            sidebar: document.getElementById('modal-sidebar'),
            poster: document.getElementById('modal-poster'),
            linksContainer: document.getElementById('modal-links'),
            
            logo: document.getElementById('modal-logo'),
            title: document.getElementById('modal-game-title'),
            devInfo: document.getElementById('modal-developer'),
            date: document.getElementById('modal-game-date'),
            status: document.getElementById('modal-game-status'),
            tags: document.getElementById('modal-tags'),
            desc: document.getElementById('modal-description'),
            
            rightSidebar: document.getElementById('modal-right-sidebar'),
            reqContainer: document.getElementById('modal-requirements'),
            reqContent: document.querySelector('.req-content'),
            
            screenContainer: document.getElementById('modal-screenshots'),
            screenGrid: document.querySelector('.screenshots-grid')
        };

        this.initEvents();
    }

    initEvents() {
        this.closeBtn.addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            const rect = this.modal.getBoundingClientRect();
            const isInDialog = (
                rect.top <= e.clientY && 
                e.clientY <= rect.top + rect.height && 
                rect.left <= e.clientX && 
                e.clientX <= rect.left + rect.width
            );
            if (!isInDialog) this.close();
        });
    }

    clearState() {
        this.els.bg.style.opacity = '0';
        this.els.bg.style.backgroundImage = 'none';
        
        this.els.poster.style.display = 'none';
        this.els.logo.style.display = 'none';
        this.els.title.style.display = 'block';
        this.els.linksContainer.style.display = 'none';
        this.els.linksContainer.innerHTML = '';
        this.els.tags.innerHTML = '';
        this.els.devInfo.textContent = '';
        
        this.els.rightSidebar.style.display = 'none';
        this.els.reqContent.innerHTML = '';
        
        this.els.screenContainer.style.display = 'none';
        this.els.screenGrid.innerHTML = '';
        
        this.els.desc.innerHTML = '';
    }

    // УМНЫЙ ПАРСИНГ ТРЕБОВАНИЙ
    parseSpecsString(specStr) {
        if (!specStr) return '';
        const parts = specStr.split('|').map(s => s.trim()).filter(s => s);
        if (parts.length > 0 && (parts[0].includes('Минимальные') || parts[0].includes('Рекомендованные'))) {
            parts.shift(); 
        }
        
        return `<ul class="req-list">` + parts.map(p => {
            // Ищем двоеточие, чтобы отделить "ОС:" от "Windows 10"
            const colonIndex = p.indexOf(':');
            if (colonIndex !== -1 && colonIndex < 25) { // Ограничиваем длину ярлыка
                const label = p.substring(0, colonIndex + 1);
                const value = p.substring(colonIndex + 1);
                return `<li><span class="req-label">${label}</span>${value}</li>`;
            }
            return `<li>${p}</li>`;
        }).join('') + `</ul>`;
    }

    open(game) {
        this.clearState();

        const assets = game.assets || {};
        
        const bgImage = assets.banner || assets.cover;
        if (bgImage) {
            const img = new Image();
            img.src = `${this.baseAssetPath}${bgImage}`;
            img.onload = () => {
                this.els.bg.style.backgroundImage = `url('${img.src}')`;
                this.els.bg.style.opacity = '1';
            };
        }

        if (game.developer) {
            this.els.devInfo.textContent = `Разработчик: ${game.developer}` + (game.publisher && game.publisher !== game.developer ? ` • Издатель: ${game.publisher}` : '');
        }

        this.els.date.textContent = game.release_date || 'TBA';
        
        const lowerDate = (game.release_date || '').toLowerCase();
        if (lowerDate.includes('скоро') || lowerDate.includes('не объявлена') || lowerDate.includes('2025')) {
            this.els.status.textContent = 'В разработке';
        } else {
            this.els.status.textContent = 'Вышла';
        }
        
        if (game.tags && game.tags.length > 0) {
            const displayTags = game.tags.slice(0, 8);
            displayTags.forEach(tag => {
                const span = document.createElement('span');
                span.className = 'game-tag';
                span.textContent = tag;
                this.els.tags.appendChild(span);
            });
        }

        if (assets.cover) {
            this.els.poster.src = `${this.baseAssetPath}${assets.cover}`;
            this.els.poster.style.display = 'block';
            this.els.sidebar.style.display = 'flex';
        }

        if (game.steam_id) {
            const a = document.createElement('a');
            a.href = `https://store.steampowered.com/app/${game.steam_id}/`;
            a.className = 'store-link';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            
            // Идеальная SVG иконка (Single-Path Winding) — никогда не слипается
            a.innerHTML = `
                <svg width="22" height="22" viewBox="0 0 496 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.6-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 39.2 0 71.9-32.4 70.2-73.5l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256zM155.7 384.3l-30.5-12.6a52.79 52.79 0 0 0 27.2 25.8c26.9 11.2 57.8-1.6 69-28.4 5.4-13 5.5-27.3.1-40.3-5.4-13-15.5-23.2-28.5-28.6-12.9-5.4-26.7-5.2-38.9-.6l31.5 13c19.8 8.2 29.2 30.9 20.9 50.7-8.3 19.9-31 29.2-50.8 21zM356.1 163.6c-27.4 0-49.8 22.3-49.8 49.8s22.4 49.8 49.8 49.8 49.8-22.3 49.8-49.8-22.4-49.8-49.8-49.8zm-8.6 77.1c-15.1 0-27.3-12.2-27.3-27.3s12.2-27.3 27.3-27.3 27.3 12.2 27.3 27.3-12.2 27.3-27.3 27.3z"/>
                </svg> 
                Steam
            `;
            
            this.els.linksContainer.appendChild(a);
            this.els.linksContainer.style.display = 'flex';
            this.els.sidebar.style.display = 'flex';
        }

        if (assets.logo) {
            this.els.logo.src = `${this.baseAssetPath}${assets.logo}`;
            this.els.logo.style.display = 'block';
            this.els.title.style.display = 'none';
            
            this.els.logo.onerror = () => {
                this.els.logo.style.display = 'none';
                this.els.title.style.display = 'block';
                this.els.title.textContent = game.title;
            };
        } else {
            this.els.logo.style.display = 'none';
            this.els.title.style.display = 'block';
            this.els.title.textContent = game.title;
        }
        
        this.els.desc.textContent = game.description || 'Детальная информация пока отсутствует.';

        if (game.specs) {
            let reqHtml = '';
            if (game.specs.minimum && game.specs.minimum.length > 15) {
                reqHtml += `<div class="req-block"><h5 class="req-title">Минимальные:</h5>${this.parseSpecsString(game.specs.minimum)}</div>`;
            }
            if (game.specs.recommended && game.specs.recommended.length > 15) {
                reqHtml += `<div class="req-block"><h5 class="req-title">Рекомендованные:</h5>${this.parseSpecsString(game.specs.recommended)}</div>`;
            }
            if (reqHtml) {
                this.els.reqContent.innerHTML = reqHtml;
                this.els.rightSidebar.style.display = 'flex';
            }
        }

        if (assets.screenshots && assets.screenshots.length > 0) {
            assets.screenshots.forEach(filename => {
                const img = document.createElement('img');
                img.src = `${this.baseAssetPath}${filename}`;
                img.className = 'screenshot-img';
                img.loading = 'lazy';
                img.addEventListener('click', () => {
                    if (this.lightbox) this.lightbox.open(img.src);
                });
                this.els.screenGrid.appendChild(img);
            });
            this.els.screenContainer.style.display = 'block';
        }

        this.modal.showModal();
        requestAnimationFrame(() => this.modal.classList.add('active'));
    }

    close() {
        this.modal.classList.remove('active');
        setTimeout(() => this.modal.close(), 300);
    }
}