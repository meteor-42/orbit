const { exec } = require('child_process');

// Получаем IP из аргумента командной строки
const ip = process.argv[2];

// Проверка, что IP был передан
if (!ip) {
  console.error('Пожалуйста, укажите IP-адрес для блокировки');
  process.exit(1);
}

// Функция для выполнения команд
function executeCommand(command) {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Ошибка при выполнении команды: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Ошибка: ${stderr}`);
      return;
    }
    console.log(`Результат: ${stdout}`);
  });
}

// Формируем команду для добавления IP в блокировку
const command = `sudo ufw deny from ${ip} to any`;

// Выполняем команду
executeCommand(command);
