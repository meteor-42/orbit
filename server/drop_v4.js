const { exec } = require('child_process');

const ip = process.argv[2];

if (ip) {
  // Добавить правило DROP для IP
  const cmd = `sudo iptables -A INPUT -s ${ip} -j DROP`;

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error(`❌ Ошибка при добавлении правила:\n${stderr}`);
      process.exit(1);
    } else {
      console.log(`✅ IP ${ip} добавлен в DROP`);
    }
  });
} else {
  // Показать текущие правила DROP
  const listCmd = `sudo iptables -L INPUT -n --line-numbers | grep DROP`;

  exec(listCmd, (err, stdout, stderr) => {
    if (err) {
      console.error(`❌ Ошибка при получении правил:\n${stderr}`);
      process.exit(1);
    } else if (!stdout.trim()) {
      console.log('🚫 DROP-правил не найдено');
    } else {
      console.log('📋 DROP-правила:');
      console.log(stdout);
    }
  });
}
