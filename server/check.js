const express = require('express');
const fs = require('fs');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = 80;
const LOG_FILE = 'requests.log';

// Создаем лог-файл, если его нет
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, '');
}

// Настраиваем расширенное логгирование
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
app.use(morgan('combined', { stream: logStream }));

// Middleware для сбора полной информации о запросе
app.use((req, res, next) => {
  const requestData = {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    ips: req.ips, // Для X-Forwarded-For
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body,
    query: req.query
  };

  // Записываем в лог
  fs.appendFile(LOG_FILE, JSON.stringify(requestData, null, 2) + '\n\n', (err) => {
    if (err) console.error('Ошибка записи в лог:', err);
  });

  next();
});

// Обработка всех GET запросов
app.get('*', (req, res) => {
  res.status(404).send('Not Found');
});

// Обработка всех остальных методов
app.all('*', (req, res) => {
  res.status(404).send('Not Found');
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Логи записываются в файл: ${path.resolve(LOG_FILE)}`);
});
