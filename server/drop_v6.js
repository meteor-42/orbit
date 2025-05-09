const { exec } = require('child_process');

const ip = process.argv[2];

if (ip) {
  // Добавить правило DROP для IP v6
  const cmd = `sudo ip6tables -A INPUT -s ${ip} -j DROP`;

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error(`❌ Ошибка при добавлении правила:\n${stderr}`);
      process.exit(1);
    } else {
      console.log(`✅ IP ${ip} добавлен в DROP (IPv6)`);
    }
  });
} else {
  // Показать текущие правила DROP для IPv6
  const listCmd = `sudo ip6tables -L INPUT -n --line-numbers | grep DROP`;

  exec(listCmd, (err, stdout, stderr) => {
    if (err) {
      console.error(`❌ Ошибка при получении правил:\n${stderr}`);
      process.exit(1);
    } else if (!stdout.trim()) {
      console.log('🚫 DROP-правил для IPv6 не найдено');
    } else {
      console.log('📋 DROP-правила для IPv6:');
      console.log(stdout);
    }
  });
}
