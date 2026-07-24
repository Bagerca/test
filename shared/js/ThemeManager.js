export class ThemeManager {
    constructor(toggleBtnId) {
        this.themeToggle = document.getElementById(toggleBtnId);
        this.init();
    }

    init() {
        if (!this.themeToggle) return;
        
        const savedTheme = localStorage.getItem('bendy-theme') || 'dark';
        this.updateIcon(savedTheme);

        this.themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('bendy-theme', newTheme);
            this.updateIcon(newTheme);
            console.info(`[ThemeManager] Тема изменена на: ${newTheme}`);
        });
    }

    updateIcon(theme) {
        const sun = this.themeToggle.querySelector('.icon-sun');
        const moon = this.themeToggle.querySelector('.icon-moon');
        if (theme === 'dark') {
            sun.style.display = 'block';
            moon.style.display = 'none';
        } else {
            sun.style.display = 'none';
            moon.style.display = 'block';
        }
    }
}