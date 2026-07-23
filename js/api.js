export async function fetchFeedData(url) {
    try {
        // Уникальный параметр предотвращает кеширование браузером
        const response = await fetch(`${url}?t=${new Date().getTime()}`, {
            cache: 'no-store'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('[API Error] Ошибка загрузки ленты:', error);
        throw error;
    }
}

/**
 * Асинхронная функция для перевода текста через бесплатный эндпоинт Google Translate
 */
export async function translateTextApi(text, targetLang = 'ru') {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Google API HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        // Google возвращает массив массивов, где первый элемент каждого подмассива — это переведенное предложение. Склеиваем их.
        return data[0].map(item => item[0]).join('');
    } catch (error) {
        console.error('[Translation API Error] Не удалось перевести текст:', error);
        throw error;
    }
}