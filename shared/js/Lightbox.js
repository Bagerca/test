export class LightboxManager {
    constructor(lightboxId, imgId) {
        this.lightbox = document.getElementById(lightboxId);
        this.lightboxImg = document.getElementById(imgId);
        this.init();
    }

    init() {
        if (!this.lightbox) return;

        this.lightbox.addEventListener('click', (e) => {
            if (e.target !== this.lightboxImg) this.close();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });
    }

    open(imgSrc) {
        this.lightboxImg.src = imgSrc;
        this.lightbox.classList.add('active');
        this.lightbox.showModal(); // Использование семантики <dialog>
    }

    close() {
        this.lightbox.classList.remove('active');
        setTimeout(() => this.lightbox.close(), 300);
    }
}