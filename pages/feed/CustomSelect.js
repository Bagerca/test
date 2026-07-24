export class CustomSelect {
    constructor(containerId, onChangeCallback) {
        this.container = document.getElementById(containerId);
        this.trigger = this.container.querySelector('.custom-select-trigger');
        this.dropdown = this.container.querySelector('.custom-select-dropdown');
        this.currentValueEl = this.container.querySelector('.custom-select-value span:last-child');
        this.currentAvatarEl = this.container.querySelector('.custom-select-avatar-placeholder');
        
        this.onChange = onChangeCallback;
        this.selectedValue = 'all';
        this.isOpen = false;
        this.fallbackAvatar = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="%2365676B" stroke-width="2"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/%3E%3Ccircle cx="12" cy="7" r="4"/%3E%3C/svg%3E';

        this.trigger.addEventListener('click', () => this.toggle());
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target) && this.isOpen) this.close();
        });
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.container.classList.toggle('active', this.isOpen);
        this.trigger.setAttribute('aria-expanded', this.isOpen);
    }

    close() {
        this.isOpen = false;
        this.container.classList.remove('active');
        this.trigger.setAttribute('aria-expanded', 'false');
    }

    populate(authors) {
        this.dropdown.innerHTML = '';
        this.addOption({ handle: 'all', name: 'Все разработчики', avatarUrl: null });
        authors.forEach(author => this.addOption(author));
    }

    addOption(author) {
        const li = document.createElement('li');
        li.className = 'custom-select-option';
        if (author.handle === this.selectedValue) li.classList.add('selected');

        const avatarSrc = author.avatarUrl || this.fallbackAvatar;
        
        li.innerHTML = author.handle === 'all' 
            ? `<div class="custom-select-avatar-placeholder svg-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg></div><div class="custom-select-text"><span>Все разработчики</span></div>`
            : `<img src="${avatarSrc}" alt="Avatar" class="custom-select-avatar" onerror="this.src='${this.fallbackAvatar}'"><div class="custom-select-text"><span>${author.handle}</span></div>`;

        li.addEventListener('click', () => this.selectValue(author, li));
        this.dropdown.appendChild(li);
    }

    selectValue(author, liElement) {
        this.selectedValue = author.handle;
        this.currentValueEl.textContent = author.handle === 'all' ? 'Все разработчики' : author.handle;
        
        if (author.handle === 'all') {
            this.currentAvatarEl.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>`;
            this.currentAvatarEl.classList.add('svg-icon');
        } else {
            this.currentAvatarEl.innerHTML = `<img src="${author.avatarUrl || this.fallbackAvatar}" alt="Avatar" class="custom-select-avatar">`;
            this.currentAvatarEl.classList.remove('svg-icon');
        }

        this.dropdown.querySelectorAll('li').forEach(opt => opt.classList.remove('selected'));
        liElement.classList.add('selected');

        this.close();
        if (this.onChange) this.onChange(this.selectedValue);
    }
}