import { Logger } from './Logger.js';

export async function fetchData(url) {
    try {
        const response = await fetch(`${url}?t=${new Date().getTime()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        Logger.error(`Ошибка загрузки данных с ${url}:`, error);
        throw error;
    }
}

export async function translateTextApi(text, targetLang = 'ru') {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        
        if (response.status === 429) {
            throw new Error('RATE_LIMIT');
        }
        if (!response.ok) {
            throw new Error(`Google API HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        return data[0].map(item => item[0]).join('');
    } catch (error) {
        Logger.error('Ошибка Translation API:', error.message);
        throw error;
    }
}