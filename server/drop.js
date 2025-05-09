const { exec } = require('child_process');
const ip = process.argv[2];

function isIPv6(ip) {
  return ip.includes(':');
}

function addDropRule(ip) {
  const isV6 = isIPv6(ip);
  const table = isV6 ? 'ip6tables' : 'iptables';

  const checkCmd = `sudo ${table} -C INPUT -s ${ip} -j DROP`;
  const addCmd = `sudo ${table} -I INPUT 1 -s ${ip} -j DROP`;

  exec(checkCmd, (checkErr) => {
    if (!checkErr) {
      console.log(`⚠️  Правило для ${ip} уже существует (${table})`);
    } else {
      exec(addCmd, (err, stdout, stderr) => {
        if (err) {
          console.error(`❌ Ошибка при добавлении правила (${table}):\n${stderr}`);
          process.exit(1);
        } else {
          console.log(`✅ IP ${ip} добавлен в DROP (в начало, ${table})`);
        }
      });
    }
  });
}

function listDropRules() {
  const commands = [
    { table: 'iptables', label: 'IPv4' },
    { table: 'ip6tables', label: 'IPv6' }
  ];

  commands.forEach(({ table, label }) => {
    const listCmd = `sudo ${table} -L INPUT -n --line-numbers | grep DROP`;

    exec(listCmd, (err, stdout, stderr) => {
      if (err) {
        console.error(`❌ Ошибка при получении правил (${label}):\n${stderr}`);
      } else if (!stdout.trim()) {
        console.log(`🚫 DROP-правил не найдено (${label})`);
      } else {
        console.log(`📋 DROP-правила (${label}):`);
        console.log(stdout);
      }
    });
  });
}

if (ip) {
  addDropRule(ip);
} else {
  listDropRules();
}
