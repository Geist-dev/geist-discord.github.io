# Geist portfolio (local project)

## Запуск
1) Установи Node.js 18+  
2) В папке проекта:
```bash
npm i
npm run start
```
Открой: http://localhost:3000

## Куда класть файлы
- Картинки: папка `изображения/`
- Шрифты: папка `шрифты/`

### Boxicons (иконки)
Файл `styles/boxicons.min.css` уже подключён, но сами файлы шрифта должны лежать в `шрифты/`:
- `boxicons.woff2`, `boxicons.woff`, `boxicons.ttf` (достаточно woff2)

### Google Fonts (Inter, Fira Code)
`styles/fonts.css` сначала пытается взять woff2 из `шрифты/` (с теми же именами, что у fonts.gstatic.com),
а если их нет — подгружает с CDN.
Если хочешь только локально — скачай woff2 и положи в `шрифты/` (имена оставь как в `styles/fonts.css`).

## Настройка Discord/Spotify
ID пользователя Discord лежит в `config.json` (поле `discord_id`).
`/api/discord` берёт данные через Lanyard и отдаёт фронту.
