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
        console.error('[API Error]', error);
        throw error;
    }
}