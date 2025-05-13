#!/bin/bash

# ============================================
# IPTABLES FIREWALL + АНТИСКАН ЗАЩИТА
# ============================================
# Версия: 2.1
# Автор: Deface
# Дата: $(date +%Y-%m-%d)

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # Без цвета

# Интерфейс (автоопределение)
iface=$(ip route | grep default | awk '{print $5}')
echo -e "${GREEN}Используем сетевой интерфейс:${NC} $iface"

# Удаляем конфликтующие фаерволлы
echo -e "\n${YELLOW}=== Удаление UFW и nftables ===${NC}"
if systemctl is-active --quiet ufw; then
    sudo systemctl stop ufw
    sudo systemctl disable ufw
    sudo apt remove --purge -y ufw
    echo -e "${GREEN}[✔] ufw удалён${NC}"
else
    echo -e "${YELLOW}[i] ufw не установлен или уже отключён${NC}"
fi

if dpkg -l | grep -qw nftables; then
    sudo systemctl stop nftables
    sudo systemctl disable nftables
    sudo apt remove --purge -y nftables
    echo -e "${GREEN}[✔] nftables удалён${NC}"
else
    echo -e "${YELLOW}[i] nftables не установлен${NC}"
fi

# Отключаем IPv6
echo -e "\n${YELLOW}=== Отключение IPv6 ===${NC}"
if ! grep -q 'disable_ipv6' /etc/sysctl.d/99-ipv6-disable.conf 2>/dev/null; then
    cat <<EOF | sudo tee /etc/sysctl.d/99-ipv6-disable.conf
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
EOF
else
    echo -e "${YELLOW}[i] Настройки IPv6 уже присутствуют${NC}"
fi
sudo sysctl -p /etc/sysctl.d/99-ipv6-disable.conf

# Очистка ip6tables
sudo ip6tables -F
sudo ip6tables -X
sudo ip6tables -P INPUT DROP
sudo ip6tables -P FORWARD DROP
sudo ip6tables -P OUTPUT DROP

# Проверка команд
check_command() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[\u2713] $1 успешно выполнена${NC}"
    else
        echo -e "${RED}[\u2717] $1 завершилась с ошибкой${NC}"
        exit 1
    fi
}

# Очистка iptables
echo -e "\n${YELLOW}=== Очистка текущих iptables правил ===${NC}"
sudo iptables -F
sudo iptables -X
sudo iptables -t nat -F
sudo iptables -t nat -X
sudo iptables -t mangle -F
sudo iptables -t mangle -X

# Политика по умолчанию
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT DROP

# Разрешаем loopback
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A OUTPUT -o lo -j ACCEPT

# Разрешаем установленные соединения
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A OUTPUT -m conntrack --ctstate NEW,ESTABLISHED,RELATED -j ACCEPT

# DNS
sudo iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT
sudo iptables -A INPUT -p udp --sport 53 -j ACCEPT
sudo iptables -A INPUT -p tcp --sport 53 -j ACCEPT

# HTTP/HTTPS
sudo iptables -A INPUT -i "$iface" -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -i "$iface" -p tcp --dport 443 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT

# SSH нестандартный порт
sudo iptables -A INPUT -i "$iface" -p tcp --dport 666 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 666 -j ACCEPT

# Брут-форс защита SSH
sudo iptables -A INPUT -p tcp --dport 666 -m connlimit --connlimit-above 5 --connlimit-mask 32 -j DROP

# WireGuard
sudo iptables -A INPUT -i "$iface" -p udp --dport 51820 -j ACCEPT
sudo iptables -A OUTPUT -p udp --dport 51820 -j ACCEPT

# Ping
sudo iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT
sudo iptables -A OUTPUT -p icmp --icmp-type echo-reply -j ACCEPT

# ==== АНТИСКАН ====
# NULL scan
sudo iptables -A INPUT -p tcp --tcp-flags ALL NONE -j DROP
# XMAS scan
sudo iptables -A INPUT -p tcp --tcp-flags ALL ALL -j DROP
# FIN scan
sudo iptables -A INPUT -p tcp --tcp-flags ALL FIN -j DROP
# SYN-флуд
sudo iptables -N syn_flood
sudo iptables -A INPUT -p tcp --syn -j syn_flood
sudo iptables -A syn_flood -m limit --limit 2/second --limit-burst 4 -j RETURN
sudo iptables -A syn_flood -j LOG --log-prefix "SYN flood: "
sudo iptables -A syn_flood -j DROP

# Логируем всё остальное
sudo iptables -A INPUT -j LOG --log-prefix "IPTables-Dropped: " --log-level 4
sudo iptables -A INPUT -j DROP

# Проверяем и включаем IP forwarding
echo -e "\n${YELLOW}=== Проверка IP Forwarding ===${NC}"
if grep -q "^net.ipv4.ip_forward *= *1" /etc/sysctl.conf || sysctl net.ipv4.ip_forward | grep -q 1; then
    echo -e "${GREEN}[✔] IP forwarding уже включён${NC}"
else
    echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf
    sudo sysctl -w net.ipv4.ip_forward=1
    echo -e "${GREEN}[✔] IP forwarding включён${NC}"
fi

# Сохраняем правила
echo -e "\n${YELLOW}=== Сохраняем iptables правила ===${NC}"
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
check_command "Сохранение iptables"

# Статус
echo -e "\n${YELLOW}=== Текущие правила iptables ===${NC}"
sudo iptables -L -v --line-numbers