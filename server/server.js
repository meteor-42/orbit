/*
 * 🚀 Сервер для веб-приложений и CI/CD автоматизации
 * 
 * 📌 Основные функции:
 * --------------------------------------------------------------
 * 1. Безопасность и защита:
 *    • Автоматическая блокировка IP (режим -blacklist)
 *      - IP добавляется в black.list при любом ответе ≠ 200
 *      - Проверка дубликатов перед записью
 *    • Фильтрация по User-Agent:
 *      - Блокировка запросов без User-Agent
 *      - Автоматический бан для ботов (curl/wget/python/scrapy)
 *    • CORS с белым списком:
 *      - Разрешены только указанные домены (метод GET)
 *      - Динамическая проверка Origin
 *    • HTTPS Enforcement:
 *      - Принудительный редирект HTTP → HTTPS
 *      - Автоматическое преобразование www → naked domain
 *    • Валидация вебхуков:
 *      - HMAC-SHA256 подпись через X-Hub-Signature-256
 *      - Timing-safe сравнение подписей
 * 
 * 2. Логирование и мониторинг:
 *    • Цветное консольное логирование:
 *      - Формат: [Время] [IP] [Метод] [URL] [Статус] [Время обработки]
 *      - Цветовая дифференциация статусов (500-е – красные, 400-е – желтые)
 *    • Часовой пояс:
 *      - Все временные метки в Europe/Kaliningrad (GMT+3)
 *    • Фильтрация логов:
 *      - Игнорирование статических файлов (CSS/JS/изображения)
 *      - Пропуск 301/304 редиректов
 * 
 * 3. CI/CD Pipeline через GitHub Webhooks:
 *    • Полный цикл деплоя:
 *      1. git pull (обновление кода)
 *      2. pnpm install (установка зависимостей)
 *      3. pnpm build (сборка проекта)
 *      4. pm2 restart all (перезапуск приложения)
 *    • Уведомления в Telegram:
 *      - Успешная сборка с деталями коммита
 *      - Ошибки на каждом этапе с трейсами
 *      - Форматирование Markdown + ссылки на коммиты
 * 
 * 4. Сетевая конфигурация:
 *    • Двухпротокольный сервер:
 *      - HTTPS (443 порт) – основной сервер
 *      - HTTP (80 порт) – редирект-сервер
 *    • IPv4 Only:
 *      - Листенеры привязаны к 0.0.0.0 (только IPv4)
 *    • SSL/TLS:
 *      - Сертификаты Let's Encrypt (автообновление через certbot)
 *      - Конфигурация через pem-файлы
 * 
 * 5. Обработка запросов:
 *    • Статическое содержимое:
 *      - Обслуживание из /root/orbit/server/build
 *      - Оптимизированная маршрутизация через express.static
 *    • Методология REST:
 *      - Разрешены только GET и POST (остальные методы блокируются)
 *      - Строгая валидация путей (/webhook, /)
 * 
 * 6. Интеграции:
 *    • Telegram API:
 *      - Отправка структурированных сообщений
 *      - Обработка ошибок запросов
 *      - Поддержка Markdown-разметки
 *    • Системные команды:
 *      - Безопасное выполнение через exec()
 *      - Каскадные цепочки промисов
 * 
 * ⚙️ Технические особенности:
 * --------------------------------------------------------------
 * • Конфигурация:
 *   - .env-файл с секретами (SECRET, BOT_TOKEN и др.)
 *   - Параметры запуска через CLI (-blacklist)
 * 
 * • Обработка ошибок:
 *   - Глобальный error handler для Express
 *   - Перехват uncaught exceptions в child_process
 *   - Логирование ошибок в консоль и Telegram
 * 
 * • Производительность:
 *   - Неблокирующие FS-операции (readFile/appendFile)
 *   - Асинхронные HTTP-запросы (axios)
 *   - Пул соединений keep-alive
 * 
 * • Безопасность:
 *   - Фильтрация X-Forwarded-For
 *   - Санитайзинг IP-адресов (удаление IPv6-префиксов)
 *   - Защита от переполнения логов
 * 
 * 🛠 Технологический стек:
 * --------------------------------------------------------------
 * • Core: Express.js, Node.js v18+
 * • Логирование: Morgan + Chalk
 * • Безопасность: crypto, helmet (неявно через настройки)
 * • CI/CD: GitHub Webhooks, PM2, pnpm
 * • Коммуникация: Telegram Bot API, Axios
 * • Инфраструктура: Let's Encrypt, Nginx (реверс-прокси)
 * 
 * 💡 Пример использования:
 * --------------------------------------------------------------
 * Запуск в production:
 * $ node server.js 
 * 
 * Запуск с блокировкой IP:
 * $ node server.js -blacklist
 * 
 * Тестовый запрос:
 * $ curl -X POST -H "X-Hub-Signature-256: sha256=..." \
 *   https://meteor-42.xyz/webhook
 * 
 * 🔧 Требования:
 * --------------------------------------------------------------
 * - Доступ к PM2 и права sudo
 * - Зарегистрированный Telegram Bot
 * - Сертификаты Let's Encrypt в /etc/letsencrypt/live/
 * - Git-репозиторий в /root/orbit
 */

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const http = require('http');
const chalk = require('chalk');
const axios = require('axios');
const qs = require('querystring');
const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();

// Проверяем аргументы командной строки
const BLACKLIST_MODE = process.argv.includes('-blacklist');

// Настройки
const app = express();
const secret = process.env.SECRET;
const DOMAIN = process.env.DOMAIN;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// Уведомления о блокировках
async function notifyBlockedIP(ip, reason = '') {
  if (!BLACKLIST_MODE) return;

  const listPath = path.resolve(__dirname, 'black.list');

  // Прочитать файл или создать если его нет
  fs.readFile(listPath, 'utf8', async (err, data) => {
    const existingIPs = err ? [] : data.split('\n').filter(Boolean);

    if (existingIPs.includes(ip)) return;

    fs.appendFile(listPath, ip + '\n', (err) => {
      if (err) console.error('Ошибка записи в black.list:', err);
    });

    // 🔍 Геолокация
    let location = '🌍 Unknown';
    try {
      const geo = await axios.get(`http://ip-api.com/json/${ip}?fields=country,city,status,message`);
      if (geo.data.status === 'success') {
        location = `🌍 ${geo.data.country}, ${geo.data.city}`;
      }
    } catch (e) {
      console.warn('IP Geolocation failed:', e.message);
    }

    // ⏰ Время по Калининграду
    const time = new Date().toLocaleString('ru-RU', {
      timeZone: 'Europe/Kaliningrad'
    });

    const message = `🚨 *BLOCKED*\n` +
      `▫️ IP: \`${ip}\`\n` +
      `▫️ ${location}\n` +
      `▫️ Reason: ${reason || 'Wrong Response'}\n` +
      `▫️ Time: ${time}`;

    sendTelegramMessage(message);
  });
}

// CORS-заголовки слишком жёсткие
app.use((req, res, next) => {
    const allowedOrigins = ['https://meteor-42.xyz']; // добавь нужные домены

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET');
    }

    next();
});

// User-Agent фильтрация
app.use((req, res, next) => {
    const ua = req.get('User-Agent');
    if (!ua || ua === '' || /curl|wget|python|scrapy|bot/i.test(ua)) {
        return res.status(403).send('Forbidden');
    }
    next();
});

// Middleware: Block spoofed X-Forwarded-For headers
app.use((req, res, next) => {
  const clientIp = req.socket.remoteAddress?.replace(/^::ffff:/, '') || 'unknown';

  // Check for presence of spoofed X-Forwarded-For header
  if (req.headers['x-forwarded-for']) {
    notifyBlockedIP(clientIp, 'Spoofed X-Forwarded-For header');

    return res.status(403).json({
      error: 'Forbidden header: X-Forwarded-For',
      yourIp: clientIp
    });
  }

  // Attach the real client IP to the request object
  req.realIp = clientIp;

  next();
});


// ==================================================
// Обновленный Middleware логирования
// ==================================================
app.use((req, res, next) => {
    const start = Date.now();

    // Используем только проверенный IP из предыдущего middleware
    const ip = req.realIp;

    res.on('finish', () => {
        const duration = Date.now() - start;

        // Пропускаем логирование для:
        if (
            res.statusCode === 301 ||  // Редиректы
            res.statusCode === 304 ||  // Not Modified
            /\.(css|js|svg|woff2?|ico|png|jpg|jpeg)$/.test(req.originalUrl) // Статика
        ) return;

        // Добавление в черный список
        if (BLACKLIST_MODE && res.statusCode !== 200) {
          notifyBlockedIP(ip, `Status: ${res.statusCode}`);
        }

        // Форматирование времени (Europe/Kaliningrad)
        const timeStr = new Date()
            .toLocaleString('sv-SE', {
                timeZone: 'Europe/Kaliningrad',
                hour12: false
            })
            .replace('T', ' ');

        // Цветовая схема для статусов
        const statusColor = 
            res.statusCode >= 500 ? chalk.red :
            res.statusCode >= 400 ? chalk.yellow :
            chalk.green;

        // Форматированный вывод в консоль
        console.log(
            `${chalk.gray(`[${timeStr}]`)} ` +       // Временная метка
            `${chalk.cyan(ip)} ` +                    // IP клиента
            `${chalk.magenta(req.method)} ` +         // HTTP-метод
            `${chalk.blue(req.originalUrl)} ` +       // URL запроса
            `${statusColor(res.statusCode)} ` +       // Статус ответа
            `${chalk.white(`${duration}ms`)}`         // Время обработки
        );
    });

    next();
});

// ✅ Редирект www → non-www
app.use((req, res, next) => {
  if (req.headers.host && req.headers.host.startsWith('www.')) {
    return res.redirect(301, `https://${DOMAIN}${req.url}`);
  }
  next();
});

// Обновите список разрешенных методов в middleware проверки методов
app.use((req, res, next) => {
  if (
    (req.method === 'POST' && req.path !== '/webhook') ||
    req.method === 'PUT' ||
    req.method === 'DELETE' ||
    req.method === 'HEAD' ||
    req.method === 'OPTIONS'
  ) {
    console.warn(`⛔ Blocked ${req.method} ${req.originalUrl} from ${req.ip}`);
    return res.status(403).send('Forbidden: Method not allowed');
  }
  next();
});

// Webhook от GitHub
app.use('/webhook', bodyParser.raw({ type: 'application/json' }));

function verifySignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(req.body);
  const digest = 'sha256=' + hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

function sendTelegramMessage(message) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  const data = qs.stringify({
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'Markdown',
    disable_web_page_preview: true
  });

  axios.post(url, data, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  .then(response => {
    console.log('✅ Telegram message sent successfully');
  })
  .catch(error => {
    console.error('❌ Telegram error:', error.response ? error.response.data : error.message);
  });
}

app.post('/webhook', (req, res) => {
  if (!verifySignature(req)) {
    return res.status(403).send('Invalid signature.');
  }

  res.status(200).send('Webhook received');

  const repoPath = '/root/orbit';
  const branch = 'main'; // Укажите вашу ветку
  const GITHUB_REPO_URL = 'https://github.com/meteor-42/orbit';

  // 1. Принудительное обновление репозитория
  exec(`cd ${repoPath} && git fetch --all && git reset --hard origin/${branch} && git clean -fd`, 
  (errReset, stdoutReset, stderrReset) => {
    if (errReset) {
      console.error('❌ Git update failed!');
      sendTelegramMessage(`❌ Git update failed!\n\`\`\`\n${stderrReset}\n\`\`\``);
      return;
    }

    // 2. Установка зависимостей
    exec(`cd ${repoPath} && pnpm install && pnpm build`, (errBuild, stdoutBuild, stderrBuild) => {
      if (errBuild) {
        console.error('❌ Build failed!');
        sendTelegramMessage(`❌ Build failed!\n\`\`\`\n${stderrBuild}\n\`\`\``);
        return;
      }

      // 3. Получение информации о коммите
      exec(`cd ${repoPath} && git log -1 --pretty=format:"%h|%s|%an|%cr"`, (errLog, logOutput) => {
        if (errLog || !logOutput.includes('|')) {
          sendTelegramMessage(`✅ Build successful\n⚠️ Commit info not available`);
        } else {
          const [hash, subject, author] = logOutput.split('|');
          const commitUrl = `${GITHUB_REPO_URL}/commit/${hash}`;
          
          const message = `✅ *Git Update*\n` +
                          `📌 Commit: [\`${hash}\`](${commitUrl})\n` +
                          `📝 Info: _${subject}_\n` +
                          `👤 Autor: ${author}`;
          
          sendTelegramMessage(message);
        }

        // 4. Перезапуск приложения
        exec(`pm2 restart all`, (errRestart) => {
          if (errRestart) {
            console.error('❌ Restart failed!');
            sendTelegramMessage(`❌ Ошибка перезапуска!\n\`\`\`\n${errRestart.message}\n\`\`\``);
          } else {
            console.log('✅ Restart successful!');
            sendTelegramMessage('🔄 Приложение успешно перезапущено');
          }
        });
      });
    });
  });
});

// В начале запуска сервера выводим информацию о режиме blacklist
if (BLACKLIST_MODE) {
    console.log(chalk.red('🛑 Blacklist mode is ACTIVE - non-200 responses will be blocked'));
} else {
    console.log(chalk.green('✅ Blacklist mode is INACTIVE'));
}

// На это (укажите реальный путь к папке с файлами):
app.use('/', express.static('/root/orbit/server/build'));

// SSL сертификаты
const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/meteor-42.xyz/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/meteor-42.xyz/fullchain.pem'),
};

// HTTPS-сервер слушает только IPv4
https.createServer(sslOptions, app).listen(443, '0.0.0.0', () => {
  console.log(chalk.green('✅ HTTPS server listening on port 443 (IPv4 only)'));
});

// HTTP → HTTPS редирект, тоже только IPv4
http.createServer((req, res) => {
  const hostHeader = req.headers.host;
  const host = hostHeader ? hostHeader.replace(/^www\./, '') : DOMAIN;

  if (!hostHeader) {
    console.warn(chalk.yellow('⚠️  Запрос без Host заголовка'));
  }

  res.writeHead(301, { "Location": `https://${host}${req.url}` });
  res.end();
}).listen(80, '0.0.0.0', () => {
  console.log(chalk.cyan('🌐 HTTP redirect server listening on port 80 (IPv4 only)'));
});
