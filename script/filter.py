import re
import time
from colorama import Fore, Style, init

init(autoreset=True)

AUTH_LOG = "/var/log/auth.log"

log_regex = re.compile(
    r'(?P<date>\w{3} +\d{1,2}) (?P<time>\d{2}:\d{2}:\d{2}) [\w\-]+ sshd\[\d+\]: '
    r'(?:Invalid user|Failed password for|Received disconnect from|Connection closed by|Connection reset by)? ?'
    r'(?:invalid user )?(?P<user>\w+)? ?from (?P<src_ip>\d{1,3}(?:\.\d{1,3}){3}) port (?P<port>\d+)'
)

def tail_f(file_path):
    with open(file_path, 'r') as file:
        file.seek(0, 2)
        while True:
            line = file.readline()
            if not line:
                time.sleep(0.3)
                continue
            yield line

def parse_line(line):
    match = log_regex.search(line)
    if match:
        status = (
            'FAILED' if 'Failed password' in line else
            'DISCONNECTED' if 'disconnect' in line else
            'CLOSED' if 'Connection closed' in line or 'reset by' in line else
            None
        )
        return {
            'date': match.group('date'),
            'time': match.group('time'),
            'user': match.group('user') or 'unknown',
            'ip_from': match.group('src_ip'),
            'port': match.group('port'),
            'status': status
        }
    return None

def color_status(status):
    if status == 'FAILED':
        return Fore.RED + status + Style.RESET_ALL
    elif status in ('DISCONNECTED', 'CLOSED'):
        return Fore.YELLOW + status + Style.RESET_ALL
    elif status == 'SUCCESS':
        return Fore.GREEN + status + Style.RESET_ALL
    else:
        return status

def main():
    print("📡 Real-time SSH log monitor started...\n")
    for line in tail_f(AUTH_LOG):
        data = parse_line(line)
        if data:
            print(
                f"[{data['date']} {data['time']}] "
                f"→ From {data['ip_from']}:{data['port']} "
                f"→ user: {data['user']:10} "
                f"→ status: {color_status(data['status'])}"
            )

if __name__ == "__main__":
    main()
