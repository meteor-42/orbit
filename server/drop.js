const { exec } = require('child_process');
const ip = process.argv[2];
const remove = process.argv.includes('--remove');

function isIPv6(ip) {
  return ip.includes(':');
}

function execShell(cmd, onSuccess, onError) {
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      if (onError) onError(stderr.trim());
    } else {
      if (onSuccess) onSuccess(stdout.trim());
    }
  });
}

function dropRule(ip, action) {
  const isV6 = isIPv6(ip);
  const table = isV6 ? 'ip6tables' : 'iptables';
  const checkCmd = `sudo ${table} -C INPUT -s ${ip} -j DROP`;
  const cmd = action === 'add'
    ? `sudo ${table} -I INPUT 1 -s ${ip} -j DROP`
    : `sudo ${table} -D INPUT -s ${ip} -j DROP`;

  execShell(checkCmd,
    () => {
      if (action === 'add') {
        console.log(`⚠️  Правило уже существует (${table})`);
      } else {
        execShell(cmd,
          () => console.log(`✅ Удалено DROP-правило для ${ip} (${table})`),
          (e) => console.error(`❌ Ошибка удаления:\n${e}`)
        );
      }
    },
    () => {
      if (action === 'add') {
        execShell(cmd,
          () => console.log(`✅ IP ${ip} добавлен в DROP (${table})`),
          (e) => console.error(`❌ Ошибка добавления:\n${e}`)
        );
      } else {
        console.log(`⚠️  Нет такого правила для ${ip} (${table})`);
      }
    }
  );
}

function listDropRules() {
  ['iptables', 'ip6tables'].forEach((table) => {
    const label = table === 'iptables' ? 'IPv4' : 'IPv6';
    const listCmd = `sudo ${table} -L INPUT -n --line-numbers | grep DROP`;

    execShell(listCmd,
      (output) => {
        if (!output) {
          console.log(`🚫 DROP-правил не найдено (${label})`);
        } else {
          console.log(`📋 DROP-правила (${label}):\n${output}`);
        }
      },
      (e) => console.error(`❌ Ошибка получения (${label}):\n${e}`)
    );
  });
}

// 🔧 Вход
if (ip) {
  dropRule(ip, remove ? 'remove' : 'add');
} else {
  listDropRules();
}