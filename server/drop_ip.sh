#!/bin/bash

remove=0
ip_list=()

# Функция для проверки IPv6
is_ipv6() {
  [[ "$1" == *:* ]]
}

# Получаем подсеть для IPv4 (по умолчанию /24)
ipv4_to_subnet() {
  local ip="$1"
  # Преобразуем IP в сеть с маской /24
  echo "${ip%.*}.0/24"
}

# Получаем подсеть для IPv6 (по умолчанию /112)
ipv6_to_subnet() {
  local ip="$1"
  # Преобразуем IP в сеть с маской /112
  echo "${ip%:*}:0/112"
}

# Функция для добавления или удаления правила
drop_rule() {
  local ip="$1"
  local action="$2"
  local table
  local subnet

  if is_ipv6 "$ip"; then
    table="ip6tables"
    subnet=$(ipv6_to_subnet "$ip")
  else
    table="iptables"
    subnet=$(ipv4_to_subnet "$ip")
  fi

  if sudo $table -C INPUT -s "$subnet" -j DROP 2>/dev/null; then
    if [[ "$action" == "add" ]]; then
      echo "⚠️  Правило уже существует ($table): $subnet"
    else
      if sudo $table -D INPUT -s "$subnet" -j DROP; then
        echo "✅ Удалено DROP-правило для $subnet ($table)"
      else
        echo "❌ Ошибка удаления правила для $subnet ($table)"
      fi
    fi
  else
    if [[ "$action" == "add" ]]; then
      if sudo $table -I INPUT 1 -s "$subnet" -j DROP; then
        echo "✅ Подсеть $subnet добавлена в DROP ($table)"
      else
        echo "❌ Ошибка добавления правила для $subnet ($table)"
      fi
    else
      echo "⚠️  Нет такого правила для $subnet ($table)"
    fi
  fi
}

# Функция для вывода всех DROP-правил
list_drop_rules() {
  for table in iptables ip6tables; do
    label=$([[ "$table" == "iptables" ]] && echo "IPv4" || echo "IPv6")
    echo "📋 DROP-правила ($label):"
    if ! sudo $table -L INPUT -n --line-numbers | grep DROP; then
      echo "🚫 DROP-правил не найдено ($label)"
    fi
  done
}

# Обработка аргументов
while [[ $# -gt 0 ]]; do
  case "$1" in
    --remove)
      remove=1
      shift
      ;;
    --file)
      file="$2"
      if [[ ! -f "$file" ]]; then
        echo "❌ Файл не найден: $file"
        exit 1
      fi
      while IFS= read -r line; do
        [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
        ip_list+=("$line")
      done < "$file"
      shift 2
      ;;
    *)
      ip_list+=("$1")
      shift
      ;;
  esac
done

# Если нет IP — показать список правил
if [[ "${#ip_list[@]}" -eq 0 ]]; then
  list_drop_rules
  exit 0
fi

# Применяем правило ко всем IP
for ip in "${ip_list[@]}"; do
  drop_rule "$ip" "$([[ "$remove" -eq 1 ]] && echo "remove" || echo "add")"
done#!/bin/bash

remove=0
ip_list=()

# Функция для проверки IPv6
is_ipv6() {
  [[ "$1" == *:* ]]
}

# Получаем подсеть для IPv4 (по умолчанию /24)
ipv4_to_subnet() {
  local ip="$1"
  # Преобразуем IP в сеть с маской /24
  echo "${ip%.*}.0/24"
}

# Получаем подсеть для IPv6 (по умолчанию /112)
ipv6_to_subnet() {
  local ip="$1"
  # Преобразуем IP в сеть с маской /112
  echo "${ip%:*}:0/112"
}

# Функция для добавления или удаления правила
drop_rule() {
  local ip="$1"
  local action="$2"
  local table
  local subnet

  if is_ipv6 "$ip"; then
    table="ip6tables"
    subnet=$(ipv6_to_subnet "$ip")
  else
    table="iptables"
    subnet=$(ipv4_to_subnet "$ip")
  fi

  if sudo $table -C INPUT -s "$subnet" -j DROP 2>/dev/null; then
    if [[ "$action" == "add" ]]; then
      echo "⚠️  Правило уже существует ($table): $subnet"
    else
      if sudo $table -D INPUT -s "$subnet" -j DROP; then
        echo "✅ Удалено DROP-правило для $subnet ($table)"
      else
        echo "❌ Ошибка удаления правила для $subnet ($table)"
      fi
    fi
  else
    if [[ "$action" == "add" ]]; then
      if sudo $table -I INPUT 1 -s "$subnet" -j DROP; then
        echo "✅ Подсеть $subnet добавлена в DROP ($table)"
      else
        echo "❌ Ошибка добавления правила для $subnet ($table)"
      fi
    else
      echo "⚠️  Нет такого правила для $subnet ($table)"
    fi
  fi
}

# Функция для вывода всех DROP-правил
list_drop_rules() {
  for table in iptables ip6tables; do
    label=$([[ "$table" == "iptables" ]] && echo "IPv4" || echo "IPv6")
    echo "📋 DROP-правила ($label):"
    if ! sudo $table -L INPUT -n --line-numbers | grep DROP; then
      echo "🚫 DROP-правил не найдено ($label)"
    fi
  done
}

# Обработка аргументов
while [[ $# -gt 0 ]]; do
  case "$1" in
    --remove)
      remove=1
      shift
      ;;
    --file)
      file="$2"
      if [[ ! -f "$file" ]]; then
        echo "❌ Файл не найден: $file"
        exit 1
      fi
      while IFS= read -r line; do
        [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
        ip_list+=("$line")
      done < "$file"
      shift 2
      ;;
    *)
      ip_list+=("$1")
      shift
      ;;
  esac
done

# Если нет IP — показать список правил
if [[ "${#ip_list[@]}" -eq 0 ]]; then
  list_drop_rules
  exit 0
fi

# Применяем правило ко всем IP
for ip in "${ip_list[@]}"; do
  drop_rule "$ip" "$([[ "$remove" -eq 1 ]] && echo "remove" || echo "add")"
done