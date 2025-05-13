const fs = require('fs');
const readline = require('readline');
const chalk = require('chalk');

// Путь до лог-файла SSH (можно изменить на другой при необходимости)
const AUTH_LOG = '/var/log/auth.log';

// Регулярное выражение для парсинга строки лога
const logRegex = new RegExp(
  String.raw`(?<date>\w{3}\s+\d{1,2}) (?<time>\d{2}:\d{2}:\d{2}) [\w\-]+ sshd\[\d+\]: ` +
  String.raw`(?:Invalid user|Failed password for|Received disconnect from|Connection closed by|Connection reset by)? ?` +
  String.raw`(?:invalid user )?(?<user>\w+)? ?from (?<src_ip>\d{1,3}(?:\.\d{1,3}){3}) port (?<port>\d+)`
);

// 🚀 Функция для определения статуса подключения по тексту строки
function determineStatus(line) {
  if (line.includes('Failed password')) return 'FAILED';
  if (line.includes('disconnect')) return 'DISCONNECTED';
  if (line.includes('Connection closed') || line.includes('reset by')) return 'CLOSED';
  return null;
}

// 🎨 Раскраска статусов в терминале
function colorStatus(status) {
  switch (status) {
    case 'FAILED': return chalk.red(status);
    case 'DISCONNECTED':
    case 'CLOSED': return chalk.yellow(status);
    case 'SUCCESS': return chalk.green(status);
    default: return status;
  }
}

// 📖 Основная логика парсинга строки
function parseLine(line) {
  const match = logRegex.exec(line);
  if (match) {
    const groups = match.groups;
    return {
      date: groups.date,
      time: groups.time,
      user: groups.user || 'unknown',
      ip_from: groups.src_ip,
      port: groups.port,
      status: determineStatus(line),
    };
  }
  return null;
}

// 📡 Основной цикл чтения файла в реальном времени (tail -f)
function tailFile(filePath) {
  // Открываем файл
  const stream = fs.createReadStream(filePath, {
    encoding: 'utf8',
    flags: 'r',
  });

  // Перемещаем указатель в конец файла
  stream.on('open', () => {
    fs.stat(filePath, (err, stats) => {
      if (!err) {
        stream.seek = stats.size;
      }
    });
  });

  // Чтение новых строк
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  // Обновление позиции и отслеживание изменений
  fs.watchFile(filePath, { interval: 300 }, () => {
    const newStream = fs.createReadStream(filePath, {
      start: stream.seek || 0,
      encoding: 'utf8',
    });

    newStream.on('data', (chunk) => {
      stream.seek += chunk.length;
      chunk.split('\n').forEach((line) => {
        if (line.trim() !== '') {
          const data = parseLine(line);
          if (data) {
            // Форматированный вывод
            console.log(
              `[${data.date} ${data.time}] ` +
              `→ From ${data.ip_from}:${data.port} ` +
              `→ user: ${data.user.padEnd(10)} ` +
              `→ status: ${colorStatus(data.status)}`
            );
          }
        }
      });
    });
  });
}

// ▶️ Запуск скрипта
console.log(chalk.blue('📡 Real-time SSH log monitor started...'));
tailFile(AUTH_LOG);
