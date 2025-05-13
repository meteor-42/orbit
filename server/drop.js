#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

function isIPv6(ip) {
  return ip.includes(':');
}

function ipv4ToSubnet(ip) {
  const parts = ip.split('.');
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
}

function ipv6ToSubnet(ip) {
  const parts = ip.split(':');
  parts.length = 7;
  return parts.join(':') + ':0/112';
}

function dropRule(ip, action) {
  const is6 = isIPv6(ip);
  const table = is6 ? 'ip6tables' : 'iptables';
  const subnet = is6 ? ipv6ToSubnet(ip) : ipv4ToSubnet(ip);

  try {
    execSync(`sudo ${table} -C INPUT -s ${subnet} -j DROP`, { stdio: 'ignore' });

    if (action === 'add') {
      console.log(`⚠️  Правило уже существует (${table}): ${subnet}`);
    } else {
      execSync(`sudo ${table} -D INPUT -s ${subnet} -j DROP`);
      console.log(`✅ Удалено DROP-правило для ${subnet} (${table})`);
    }
  } catch (e) {
    if (action === 'add') {
      try {
        execSync(`sudo ${table} -I INPUT 1 -s ${subnet} -j DROP`);
        console.log(`✅ Подсеть ${subnet} добавлена в DROP (${table})`);
      } catch (err) {
        console.error(`❌ Ошибка добавления правила для ${subnet} (${table})`);
      }
    } else {
      console.log(`⚠️  Нет такого правила для ${subnet} (${table})`);
    }
  }
}

function listDropRules() {
  ['iptables', 'ip6tables'].forEach(table => {
    const label = table === 'iptables' ? 'IPv4' : 'IPv6';
    console.log(`📋 DROP-правила (${label}):`);
    try {
      const output = execSync(`sudo ${table} -L INPUT -n --line-numbers`).toString();
      const lines = output.split('\n').filter(line => line.includes('DROP'));
      if (lines.length === 0) {
        console.log(`🚫 DROP-правил не найдено (${label})`);
      } else {
        lines.forEach(line => console.log(line));
      }
    } catch (err) {
      console.error(`❌ Ошибка чтения правил для ${table}: ${err.message}`);
    }
  });
}

function parseFile(file) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Файл не найден: ${file}`);
    process.exit(1);
  }

  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  return lines
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

function applyRulesFromFile(file, action) {
  const ips = parseFile(file);
  ips.forEach(ip => dropRule(ip, action));
}

function watchFileDaemon(file) {
  console.log(`🕒 Режим демона: отслеживание изменений в ${file}`);
  applyRulesFromFile(file, 'add');

  fs.watchFile(file, { interval: 1000 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
      console.log(`\n📦 Обнаружено обновление файла ${file} → Применение правил...`);
      applyRulesFromFile(file, 'add');
    }
  });
}

// === Обработка аргументов ===
let remove = false;
let daemon = false;
let file = null;
let ipList = [];

const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--remove') {
    remove = true;
  } else if (args[i] === '--file') {
    file = args[i + 1];
    if (!file || !fs.existsSync(file)) {
      console.error(`❌ Файл не найден: ${file}`);
      process.exit(1);
    }
    const ips = parseFile(file);
    ipList.push(...ips);
    i++;
  } else if (args[i] === '--daemon') {
    daemon = true;
  } else {
    ipList.push(args[i]);
  }
}

// === Логика работы ===
if (daemon) {
  if (!file) {
    console.error('❌ В режиме --daemon необходимо указать путь к файлу через --file');
    process.exit(1);
  }
  watchFileDaemon(file);
} else {
  if (ipList.length === 0) {
    listDropRules();
  } else {
    const action = remove ? 'remove' : 'add';
    ipList.forEach(ip => dropRule(ip, action));
  }
}
