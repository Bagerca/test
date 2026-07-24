import { Logger } from './Logger.js';

export function formatRichText(text) {
    if (!text) return '';

    let decodedText = text;
    const parser = new DOMParser();
    for (let i = 0; i < 3; i++) {
        const doc = parser.parseFromString(decodedText, "text/html");
        decodedText = doc.documentElement.textContent;
    }

    const div = document.createElement('div');
    div.textContent = decodedText;
    let safeHtml = div.innerHTML;

    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    safeHtml = safeHtml.replace(urlRegex, '<a href="$1" class="rich-link" target="_blank" rel="noopener noreferrer">$1</a>');

    const hashtagRegex = /#(\w+)/g;
    safeHtml = safeHtml.replace(hashtagRegex, '<a href="https://twitter.com/hashtag/$1" class="rich-link" target="_blank" rel="noopener noreferrer">#$1</a>');

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

/**
 * Вычисляет средний RGB цвет изображения (использует Canvas API)
 */
export function getAverageRGB(imgSrc, callback) {
    const img = new Image();
    img.crossOrigin = "Anonymous"; 
    
    // Используем прокси для внешних картинок во избежание CORS
    if (imgSrc.startsWith('http')) {
        img.src = `https://wsrv.nl/?w=50&h=50&fit=cover&url=${encodeURIComponent(imgSrc)}`;
    } else {
        img.src = imgSrc;
    }

    img.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);

        try {
            const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
            let r = 0, g = 0, b = 0, count = 0;
            
            for (let i = 0; i < data.length; i += 16) { 
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
            }
            r = ~~(r / count); g = ~~(g / count); b = ~~(b / count);
            // Добавляем +20 яркости, чтобы цвет не был слишком темным
            callback(`${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)}`);
        } catch(e) {
            Logger.warn(`CORS заблокировал чтение пикселей: ${imgSrc}`);
            callback(null); 
        }
    };

    img.onerror = () => callback(null);
}