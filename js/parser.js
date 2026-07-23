export function formatRichText(text) {
    if (!text) return '';

    // 1. Декодируем двойное/тройное экранирование
    let decodedText = text;
    const parser = new DOMParser();
    for (let i = 0; i < 3; i++) {
        const doc = parser.parseFromString(decodedText, "text/html");
        decodedText = doc.documentElement.textContent;
    }

    // 2. Безопасное экранирование от XSS
    const div = document.createElement('div');
    div.textContent = decodedText;
    let safeHtml = div.innerHTML;

    // 3. Расставляем ссылки
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    safeHtml = safeHtml.replace(urlRegex, '<a href="$1" class="rich-link" target="_blank" rel="noopener noreferrer">$1</a>');

    // 4. Расставляем хэштеги
    const hashtagRegex = /#(\w+)/g;
    safeHtml = safeHtml.replace(hashtagRegex, '<a href="https://twitter.com/hashtag/$1" class="rich-link" target="_blank" rel="noopener noreferrer">#$1</a>');

    // 5. Расставляем упоминания
    const mentionRegex = /@(\w+)/g;
    safeHtml = safeHtml.replace(mentionRegex, '<a href="https://twitter.com/$1" class="rich-link" target="_blank" rel="noopener noreferrer">@$1</a>');

    return safeHtml;
}

export function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}