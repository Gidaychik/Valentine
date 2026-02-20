# Лист для Вікуші 💗

Односторінковий романтичний сайт-листівка. Працює локально (.NET) та на **GitHub Pages** (статично).

## Публікація на GitHub Pages

1. **Створи репозиторій на GitHub** (наприклад, `Valentine` або `username.github.io` для головної сторінки).

2. **Увімкни GitHub Pages:**
   - Репозиторій → **Settings** → **Pages**
   - **Build and deployment** → Source: **GitHub Actions**

3. **Запуши код у репозиторій** (у терміналі Cursor або PowerShell):

   ```powershell
   cd "c:\Users\ioleksiichuk\source\repos\Valentine"
   git init
   git add .
   git commit -m "Valentine card site"
   git branch -M main
   git remote add origin https://github.com/Gidaychik/Valentine.git
   git push -u origin main
   ```

4. Після першого пушу в **Actions** запуститься workflow **Deploy to GitHub Pages**. Коли він завершиться успішно, сайт буде доступний за адресою:
   - **https://gidaychik.github.io/Valentine/**

Фото з папки `love_is_photos_archive` автоматично копіюються в артефакт і відображаються на GitHub Pages.

## Локальний запуск (.NET)

```bash
cd ValentineWeb
dotnet run
```

Відкрий у браузері: https://localhost:5001 або http://localhost:5000

Фото беруться з папки `love_is_photos_archive` (шлях у `appsettings.json`).
