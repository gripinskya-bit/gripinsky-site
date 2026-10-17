# Фавикон GRIPINSKY (общий для лендинга и сайта)

Знак академии «3D» с профилем, тёмный (`#101111`) на кислотной плитке (`#DEFB32`, цвет главных кнопок).
Сравнение с запасным вариантом (тёмная плитка) и вид во вкладках: `preview.png`.

| Файл | Где используется |
|---|---|
| `favicon.ico` | 16, 32, 48 px: вкладки, закладки, старые браузеры |
| `favicon.svg` | современные браузеры, чёткий на любом экране |
| `favicon-32.png`, `favicon-16.png` | если площадка принимает только PNG (например, Тильда) |
| `apple-touch-icon.png` | 180 px, иконка на экране iPhone/iPad |
| `icon-192.png`, `icon-512.png` | веб-манифест, Android |
| `icon-maskable-512.png` | Android, круглые и прочие маски (знак в безопасной зоне 80%) |

## Новый сайт (gripinsky-site, папка `public/`)

Имена совпадают с уже подключёнными в `manifest.webmanifest` и `<head>`: файлы просто заменяются.
Если подключаешь с нуля:

```html
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#101111">
```

## Лендинг и текущий сайт в Тильде

Фавикон в Тильде задаётся в настройках сайта (поле иконки сайта / favicon), а не блоком на странице.
Загрузи `favicon.ico` (или `favicon-32.png`, если поле принимает только PNG), а в поле иконки для смартфонов, если оно есть, `apple-touch-icon.png`.
Настройка действует на весь проект Тильды, то есть на все его страницы.

## Пересобрать

```bash
python scripts/make-favicon.py brand/favicon acid    # acid = выбранный вариант, dark = запасной
```

Нужны Pillow и Google Chrome (растрирование SVG). Знак лежит в `scripts/favicon-mark.path`.
