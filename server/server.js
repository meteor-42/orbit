const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const https = require('https');
const http = require('http');
const chalk = require('chalk');
const axios = require('axios');
const qs = require('querystring');
require('dotenv').config(); // Подключаем .env файл

// Настройки
const app = express();
const secret = process.env.SECRET;
const DIST_DIR = process.env.DIST_DIR;
const DOMAIN = process.env.DOMAIN;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

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

// 🌐 Логирование запросов
app.use((req, res, next) => {
  const start = Date.now(); // Время начала запроса

  // Определение IP-адреса клиента
  const ipRaw = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ip = ipRaw.replace(/^::ffff:/, ''); // Убираем префикс IPv6

  // После завершения ответа
  res.on('finish', () => {
    const duration = Date.now() - start; // Время обработки запроса

    // Пропускаем логирование редиректов и статики
    if (
      res.statusCode === 301 ||
      res.statusCode === 304 ||
      /\.(css|js|svg|woff2?|ico|png|jpg|jpeg)$/.test(req.originalUrl)
    ) return;

    // Формат времени в часовом поясе Калининград
    const timeStr = new Date().toLocaleString('sv-SE', {
      timeZone: 'Europe/Kaliningrad',
      hour12: false
    }).replace('T', ' ');

    // Цвет по статус-коду
    const statusColor =
      res.statusCode >= 500 ? chalk.red :
      res.statusCode >= 400 ? chalk.yellow :
      chalk.green;

    // Вывод в консоль
    console.log(
      `${chalk.gray(`[${timeStr}]`)} ` +                // 🕒 Время
      `${chalk.cyan(ip)} ` +                            // 🌐 IP клиента
      `${chalk.magenta(req.method)} ` +                 // 🔠 Метод запроса
      `${chalk.blue(req.originalUrl)} ` +               // 🔗 URL
      `${statusColor(res.statusCode)} ` +               // 📟 Статус-код
      `${chalk.white(`${duration}ms`)}`                 // ⏱️ Время обработки
    );
  });

  next(); // Передаём управление следующему middleware
});

// ✅ Редирект www → non-www
app.use((req, res, next) => {
  if (req.headers.host && req.headers.host.startsWith('www.')) {
    return res.redirect(301, `https://${DOMAIN}${req.url}`);
  }
  next();
});

app.use((req, res, next) => {
  // Разрешён только POST /webhook
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
  const GITHUB_REPO_URL = 'https://github.com/meteor-42/orbit';

  exec(`cd ${repoPath} && git pull`, (errPull, stdoutPull, stderrPull) => {
    if (errPull) {
      console.error('❌ Git pull failed!');
      sendTelegramMessage(`❌ Git pull failed!\n\`\`\`\n${stderrPull}\n\`\`\``);
      return;
    }

    exec(`cd ${repoPath} && pnpm install && pnpm build`, (errBuild, stdoutBuild, stderrBuild) => {
      if (errBuild) {
        console.error('❌ Build failed!');
        sendTelegramMessage(`❌ Build failed!\n\`\`\`\n${stderrBuild}\n\`\`\``);
        return;
      }

      exec(`cd ${repoPath} && git log -1 --pretty=format:"%h|%s|%an|%cr"`, (errLog, logOutput) => {
        if (errLog || !logOutput.includes('|')) {
          sendTelegramMessage(`✅ Build successful\n⚠️ Commit info not available`);
        } else {
          const [hash, subject, author, date] = logOutput.split('|');
          const commitUrl = `${GITHUB_REPO_URL}/commit/${hash}`;

          const message = `✅ *Build successful*` +
                          `📦 *Last commit:*[` +
                          `\`${hash}\`](${commitUrl}) - _${subject}_\n` +
                          `👤 *Author:* ${author}\n🕒 *Date:* ${date}`;

          sendTelegramMessage(message);
        }

        exec(`pm2 restart all`, (errRestart, stdoutRestart, stderrRestart) => {
          if (errRestart) {
            console.error('❌ Restart failed!');
            sendTelegramMessage(`❌ Restart failed!\n\`\`\`\n${stderrRestart}\n\`\`\``);
          } else {
            console.log('✅ Restart successful!');
            sendTelegramMessage('🔄 *App restarted successfully*');
          }
        });
      });
    });
  });
});


// Статические файлы
app.use('/', express.static(DIST_DIR));

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