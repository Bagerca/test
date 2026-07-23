import urllib.request
import urllib.error
import json
import re
import html
import os
import logging
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import List, Dict

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s', datefmt='%H:%M:%S')

class TwitterUltimateMonitor:
    def __init__(self, handles: List[str]):
        self.handles = handles
        self.output_file = "feed.json"
        self.tmp_file = "feed.json.tmp"
        self.max_history = 1000 # Храним максимум 1000 последних постов
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }

    def parse_twitter_date(self, date_str: str) -> str:
        if not date_str:
            return datetime.utcnow().isoformat() + "Z"
            
        if "T" in date_str and "Z" in date_str:
            return date_str

        try:
            parts = date_str.split()
            if len(parts) == 6:
                clean_date = f"{parts[1]} {parts[2]} {parts[3]} {parts[5]}" 
                dt = datetime.strptime(clean_date, "%b %d %H:%M:%S %Y")
                return dt.isoformat() + "Z"
        except Exception as e:
            pass
            
        return date_str 

    def load_existing_feed(self) -> List[Dict]:
        if not os.path.exists(self.output_file):
            return []
        try:
            with open(self.output_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logging.error(f"Не удалось прочитать существующий feed.json: {e}")
            return []

    # =========================================================================
    # TIER 1: Sotwe API 
    # =========================================================================
    def fetch_via_sotwe(self, handle: str) -> List[Dict]:
        url = f"https://api.sotwe.com/v3/user/{handle}"
        posts = []
        headers = self.headers.copy()
        headers['Origin'] = 'https://www.sotwe.com'
        headers['Referer'] = 'https://www.sotwe.com/'
        
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status != 200: 
                    return posts
                data = json.loads(response.read().decode('utf-8'))
                
                user = data.get('user', {})
                avatar = user.get('profile_image_url_https', '').replace('_normal', '_400x400')
                
                for t in data.get('tweets', []):
                    if t.get('retweeted_status'):
                        continue
                        
                    text = t.get('full_text', '') or t.get('text', '')
                    created_at = t.get('createdAt', '')
                    
                    if isinstance(created_at, int):
                        iso_date = datetime.utcfromtimestamp(created_at/1000).isoformat() + "Z"
                    else:
                        iso_date = self.parse_twitter_date(created_at)
                        
                    media_url = None
                    entities = t.get('entities', {})
                    if 'media' in entities and entities['media']:
                        media_url = entities['media'][0].get('media_url_https')
                        
                    posts.append({
                        "id": str(t.get('id', '')),
                        "authorName": user.get('name', handle),
                        "authorHandle": f"@{handle}",
                        "platform": "twitter",
                        "content": html.unescape(text),
                        "timestamp": iso_date,
                        "mediaUrl": media_url,
                        "avatarUrl": avatar
                    })
        except urllib.error.HTTPError as e:
            logging.warning(f"[Tier 1 Sotwe] Заблокировано (HTTP {e.code}) для @{handle}")
        except Exception as e:
            logging.warning(f"[Tier 1 Sotwe] Ошибка для @{handle}: {e}")
            
        return posts

    # =========================================================================
    # TIER 2: Syndication API (Twitter Widget)
    # =========================================================================
    def fetch_via_syndication(self, handle: str) -> List[Dict]:
        url = f"https://syndication.twitter.com/srv/timeline-profile/screen-name/{handle}"
        posts = []
        
        try:
            req = urllib.request.Request(url, headers=self.headers)
            with urllib.request.urlopen(req, timeout=8) as response:
                if response.status != 200: 
                    return posts
                html_data = response.read().decode('utf-8')
                match = re.search(r'<script id="__NEXT_DATA__" type="application/json">({.*?})</script>', html_data)
                
                if not match: 
                    logging.warning(f"[Tier 2 Synd] Структура страницы изменена, JSON не найден для @{handle}")
                    return posts
                    
                data = json.loads(match.group(1))
                entries = data.get('props', {}).get('pageProps', {}).get('timeline', {}).get('entries', [])

                for entry in entries:
                    if entry.get('type') != 'tweet': 
                        continue
                        
                    tweet = entry['content']['tweet']
                    author = tweet.get('user', {})
                    if author.get('screen_name', '').lower() != handle.lower(): 
                        continue
                        
                    media_url = None
                    if 'entities' in tweet and 'media' in tweet['entities']:
                        media_list = tweet['entities']['media']
                        if media_list: 
                            media_url = media_list[0].get('media_url_https')

                    iso_date = self.parse_twitter_date(tweet.get('created_at', ''))

                    posts.append({
                        "id": tweet.get('id_str', ''),
                        "authorName": author.get('name', handle),
                        "authorHandle": f"@{author.get('screen_name', handle)}",
                        "platform": "twitter",
                        "content": tweet.get('text', ''),
                        "timestamp": iso_date,
                        "mediaUrl": media_url,
                        "avatarUrl": author.get('profile_image_url_https', '').replace('_normal', '_400x400')
                    })
        except urllib.error.HTTPError as e:
            logging.warning(f"[Tier 2 Synd] Заблокировано (HTTP {e.code}) для @{handle}")
        except Exception as e:
            logging.warning(f"[Tier 2 Synd] Ошибка для @{handle}: {e}")
            
        return posts

    # =========================================================================
    # TIER 3: Nitter RSS Network (Самый надежный фоллбэк)
    # =========================================================================
    def fetch_via_nitter(self, handle: str) -> List[Dict]:
        instances = [
            "nitter.poast.org",
            "nitter.privacydev.net",
            "nitter.cz",
            "nitter.projectsegfau.lt",
            "nitter.net"
        ]
        posts = []
        for instance in instances:
            url = f"https://{instance}/{handle}/rss"
            try:
                req = urllib.request.Request(url, headers=self.headers)
                with urllib.request.urlopen(req, timeout=5) as response:
                    if response.status != 200: continue
                    
                    xml_data = response.read().decode('utf-8')
                    root = ET.fromstring(xml_data)
                    channel = root.find('channel')
                    
                    # Исправление DeprecationWarning (XML Element truth value)
                    if channel is None: 
                        continue
                    
                    # Ищем аватарку пользователя в шапке RSS
                    avatar_url = ""
                    image_tag = channel.find('image')
                    if image_tag is not None:
                        url_tag = image_tag.find('url')
                        if url_tag is not None and url_tag.text:
                            avatar_url = url_tag.text
                    
                    for item in channel.findall('item'):
                        title = item.find('title')
                        pubDate = item.find('pubDate')
                        guid = item.find('guid')
                        desc = item.find('description')
                        
                        text = title.text if title is not None else ""
                        date_str = pubDate.text if pubDate is not None else ""
                        post_id = guid.text.split('/')[-1].replace('#m', '') if (guid is not None and guid.text) else ""
                        
                        # Парсим картинки из описания (Nitter встраивает их в HTML description)
                        media_url = None
                        if desc is not None and desc.text:
                            img_match = re.search(r'<img[^>]+src="([^">]+)"', desc.text)
                            if img_match:
                                media_url = f"https://{instance}{img_match.group(1)}" if img_match.group(1).startswith('/') else img_match.group(1)
                        
                        # Очистка даты: "Thu, 15 Nov 2023 14:00:00 GMT" -> "Thu, 15 Nov 2023 14:00:00"
                        clean_date = date_str.replace(" GMT", "").replace(" +0000", "")
                        try:
                            dt = datetime.strptime(clean_date, "%a, %d %b %Y %H:%M:%S")
                            iso_date = dt.isoformat() + "Z"
                        except:
                            iso_date = self.parse_twitter_date(date_str)
                            
                        posts.append({
                            "id": post_id,
                            "authorName": handle,
                            "authorHandle": f"@{handle}",
                            "platform": "twitter",
                            "content": html.unescape(text),
                            "timestamp": iso_date,
                            "mediaUrl": media_url,
                            "avatarUrl": avatar_url
                        })
                        
                if posts:
                    logging.info(f"🟢 Tier 3 (Nitter: {instance}) Успех! Получено: {len(posts)}")
                    return posts # Успех - прерываем цикл по инстансам
            except Exception as e:
                logging.debug(f"[Nitter {instance}] Пропущен для @{handle}: {e}")
                continue # Если этот сервер мертв, пробуем следующий
                
        if not posts:
            logging.warning(f"[Tier 3 Nitter] Все резервные серверы недоступны для @{handle}")
            
        return posts

    # =========================================================================
    # Оркестрация и сохранение
    # =========================================================================
    def run(self):
        existing_posts = self.load_existing_feed()
        logging.info(f"Загружено постов из кэша: {len(existing_posts)}")
        
        all_fetched_posts = []
        
        for handle in self.handles:
            logging.info(f"Сбор данных: @{handle}...")
            
            # Пытаемся собрать данные из всех источников
            sotwe_posts = self.fetch_via_sotwe(handle)
            synd_posts = self.fetch_via_syndication(handle)
            nitter_posts = self.fetch_via_nitter(handle)
            
            combined = sotwe_posts + synd_posts + nitter_posts
            
            if not combined:
                logging.warning(f"⚠️ Тотальная блокировка. Не удалось получить данные для @{handle}. Будет использован кэш.")
            else:
                logging.info(f"✅ @{handle}: Собрано новых записей (с учетом дублей): {len(combined)}")
                
            all_fetched_posts.extend(combined)
            
        # Умное слияние: новые посты заменят старые по ключу ID
        merged_dict = {post['id']: post for post in existing_posts}
        for post in all_fetched_posts:
            if post['id']: # Защита от пустых ID
                merged_dict[post['id']] = post

        final_posts = list(merged_dict.values())
        self.save_feed_atomically(final_posts)

    def save_feed_atomically(self, posts: List[Dict]):
        if not posts:
            logging.warning("Нет данных для сохранения.")
            return
            
        # Жесткая сортировка по убыванию времени
        posts.sort(key=lambda x: x['timestamp'], reverse=True)
        posts = posts[:self.max_history]
        
        try:
            with open(self.tmp_file, 'w', encoding='utf-8') as f:
                json.dump(posts, f, ensure_ascii=False, indent=2)
            os.replace(self.tmp_file, self.output_file)
            logging.info(f"🎉 База обновлена и отсортирована! Всего уникальных постов: {len(posts)}")
        except Exception as e:
            logging.error(f"Ошибка при сохранении: {e}")
            if os.path.exists(self.tmp_file): os.remove(self.tmp_file)

if __name__ == "__main__":
    devs = [
        "m_ZeroLogics", 
        "BLacroix30", 
        "bookpast", 
        "themeatly"
    ] 
    monitor = TwitterUltimateMonitor(devs)
    monitor.run()