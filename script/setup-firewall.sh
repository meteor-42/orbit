#!/bin/bash

# =============================================
# УЛУЧШЕННЫЙ СКРИПТ НАСТРОЙКИ ФАЙРВОЛА
# Версия: 2.0
# Автор: Ваше имя
# Дата: $(date +%Y-%m-%d)
# =============================================

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция проверки выполнения команд
check_command() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Успех${NC}: $1"
    else
        echo -e "${RED}✗ Ошибка${NC}: $1"
        exit 1
    fi
}

# =============================================
# 1. УДАЛЕНИЕ ДРУГИХ ФАЙРВОЛОВ
# =============================================
echo -e "\n${YELLOW}=== УДАЛЕНИЕ ДРУГИХ ФАЙРВОЛОВ ===${NC}"

# Проверяем и удаляем ufw
if systemctl is-active --quiet ufw; then
    echo "🚫 Останавливаем и отключаем ufw..."
    sudo systemctl stop ufw
    sudo systemctl disable ufw
    sudo apt purge -y ufw
    check_command "Удаление ufw"
else
    echo "ℹ️ ufw не установлен или не активен"
fi

# Проверяем и удаляем nftables
if dpkg -l | grep -q nftables; then
    echo "🚫 Удаляем nftables..."
    sudo apt purge -y nftables
    check_command "Удаление nftables"
else
    echo "ℹ️ nftables не установлен"
fi

# =============================================
# 2. ОТКЛЮЧЕНИЕ IPv6
# =============================================
echo -e "\n${YELLOW}=== ОТКЛЮЧЕНИЕ IPv6 ===${NC}"

# Получаем имя интерфейса с внешним IP
iface=$(ip -o -4 route show to default | awk '{print $5}')
if [ -z "$iface" ]; then
    echo -e "${RED}✗ Не удалось определить основной сетевой интерфейс${NC}"
    exit 1
fi
echo "🔍 Основной интерфейс: $iface"

# Очищаем IPv6 адреса
echo "🧹 Очищаем IPv6 адреса на $iface..."
sudo ip -6 addr flush dev "$iface" 2>/dev/null
sudo ip -6 route flush dev "$iface" 2>/dev/null

# Отключаем IPv6 через sysctl
echo "🚫 Отключаем IPv6 через sysctl..."
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1 >/dev/null
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1 >/dev/null
sudo sysctl -w net.ipv6.conf.lo.disable_ipv6=1 >/dev/null
check_command "Отключение IPv6 через sysctl"

# Перманентное отключение IPv6
echo "📝 Добавляем настройки IPv6 в /etc/sysctl.conf..."
grep -qF 'disable_ipv6' /etc/sysctl.conf || sudo tee -a /etc/sysctl.conf >/dev/null <<EOF
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
EOF
check_command "Перманентное отключение IPv6"

# =============================================
# 3. НАСТРОЙКА IPTABLES ДЛЯ IPv4
# =============================================
echo -e "\n${YELLOW}=== НАСТРОЙКА IPTABLES ДЛЯ IPv4 ===${NC}"

# Сбрасываем все правила
echo "🧹 Сбрасываем все правила iptables..."
sudo iptables -F
sudo iptables -X
check_command "Сброс правил iptables"

# Устанавливаем политики по умолчанию
echo "🚫 Устанавливаем политики по умолчанию..."
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT ACCEPT
check_command "Установка политик по умолчанию"

# Разрешаем localhost
echo "✅ Разрешаем трафик на localhost..."
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A OUTPUT -o lo -j ACCEPT
check_command "Разрешение localhost"

# Разрешаем SSH (порт 666)
echo "✅ Разрешаем SSH на порту 666..."
sudo iptables -A INPUT -p tcp --dport 666 -j ACCEPT
check_command "Разрешение SSH"

# Разрешаем WireGuard (порт 51820)
echo "✅ Разрешаем WireGuard на порту 51820..."
sudo iptables -A INPUT -p udp --dport 51820 -j ACCEPT
check_command "Разрешение WireGuard"

# Разрешаем HTTP/HTTPS
echo "✅ Разрешаем HTTP (80) и HTTPS (443)..."
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
check_command "Разрешение HTTP/HTTPS"

# Разрешаем установленные соединения
echo "✅ Разрешаем установленные соединения..."
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
check_command "Разрешение установленных соединений"

# Разрешаем ping
echo "✅ Разрешаем ICMP (ping)..."
sudo iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT
check_command "Разрешение ping"

# =============================================
# 4. НАСТРОЙКА IP6TABLES ДЛЯ IPv6
# =============================================
echo -e "\n${YELLOW}=== НАСТРОЙКА IP6TABLES ДЛЯ IPv6 ===${NC}"

# Блокируем весь IPv6 трафик
echo "🛡️ Блокируем весь IPv6 трафик..."
sudo ip6tables -F
sudo ip6tables -X
sudo ip6tables -P INPUT DROP
sudo ip6tables -P FORWARD DROP
sudo ip6tables -P OUTPUT DROP
check_command "Блокировка IPv6"

# Явно блокируем специфичные порты IPv6
echo "🚫 Явно блокируем порты IPv6 (51820/udp, 666/tcp, 80/tcp, 443/tcp)..."
sudo ip6tables -A INPUT -p udp --dport 51820 -j DROP
sudo ip6tables -A INPUT -p tcp --dport 666 -j DROP
sudo ip6tables -A INPUT -p tcp --dport 80 -j DROP
sudo ip6tables -A INPUT -p tcp --dport 443 -j DROP
check_command "Блокировка специфичных портов IPv6"

# =============================================
# 5. СОХРАНЕНИЕ ПРАВИЛ
# =============================================
echo -e "\n${YELLOW}=== СОХРАНЕНИЕ ПРАВИЛ ===${NC}"

# Проверяем и сохраняем правила iptables
if command -v netfilter-persistent >/dev/null 2>&1; then
    echo "💾 Сохраняем правила iptables..."
    sudo netfilter-persistent save
    check_command "Сохранение правил iptables"
else
    echo -e "${YELLOW}⚠️ iptables-persistent не установлен. Правила не будут сохранены после перезагрузки.${NC}"
    echo "Установите пакет командой:"
    echo "sudo apt install iptables-persistent"
fi

# =============================================
# 6. ПРОВЕРКА И ВЫВОД ИНФОРМАЦИИ
# =============================================
echo -e "\n${YELLOW}=== ПРОВЕРКА НАСТРОЕК ===${NC}"

# Выводим текущие правила iptables
echo -e "\n${GREEN}Текущие правила IPv4 (iptables):${NC}"
sudo iptables -L -n -v --line-numbers

# Выводим текущие правила ip6tables
echo -e "\n${GREEN}Текущие правила IPv6 (ip6tables):${NC}"
sudo ip6tables -L -n -v --line-numbers

# Проверяем статус IPv6
echo -e "\n${GREEN}Статус IPv6:${NC}"
if [ "$(cat /proc/sys/net/ipv6/conf/all/disable_ipv6)" -eq 1 ]; then
    echo "✅ IPv6 отключен"
else
    echo -e "${RED}✗ IPv6 включен${NC}"
fi

# Проверяем открытые порты
echo -e "\n${GREEN}Открытые порты:${NC}"
echo "TCP:"
sudo ss -tulnp | grep -E ':(666|80|443|51820)'
echo "UDP:"
sudo ss -ulnp | grep ':51820'

# =============================================
# ЗАВЕРШЕНИЕ
# =============================================
echo -e "\n${GREEN}✅ Настройка завершена успешно!${NC}"
echo -e "Для применения всех изменений рекомендуется ${YELLOW}перезагрузить${NC} сервер:"
echo "sudo reboot"
