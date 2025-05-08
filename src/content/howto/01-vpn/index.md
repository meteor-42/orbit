---
title: "Wireguard - Installation"
summary: "How to install Wireguard on Ubuntu 22.04.5 LTS and configure it with UFW"
date: "May 1 2025"
draft: false
tags:
- VPN
---

## Prerequisites

Before installing WireGuard, make sure you are running:
- Ubuntu **22.04.5 LTS (Jammy Jellyfish)**
- A user with `sudo` privileges
- Internet access

You can verify your system version with:

```
lsb_release -a
```

## Installing WireGuard

Run the following commands to install WireGuard from the official Ubuntu repositories:

```
apt update
apt install wireguard -y
```

Verify installation:

```
wg --version
```

## Generating Keys

WireGuard uses public/private key pairs. Generate them:

```
wg genkey | tee privatekey | wg pubkey > publickey
```

## Configuring the Server

Create the main config file at `/etc/wireguard/wg0.conf`:

```
[Interface]
Address = 10.0.0.1/24
PrivateKey = <your-server-private-key>
ListenPort = 51820

[Peer]
PublicKey = <client-public-key>
AllowedIPs = 10.0.0.2/32
```

Set correct permissions:

```
chmod 600 /etc/wireguard/wg0.conf
```

## Enabling IP Forwarding

Edit `/etc/sysctl.conf` and uncomment the following line:

```
net.ipv4.ip_forward=1
```

Apply it immediately:

```
sysctl -w net.ipv4.ip_forward=1
```

## Configuring UFW (Firewall)

### 1. Allow SSH and WireGuard port:

```
ufw allow OpenSSH
ufw allow 51820/udp
```

### 2. Enable forwarding in UFW:

Edit `/etc/default/ufw`:

```
DEFAULT_FORWARD_POLICY="ACCEPT"
```

### 3. Add NAT rule:

Edit `/etc/ufw/before.rules`, and add this **before** `*filter`:

```
*nat
:POSTROUTING ACCEPT [0:0]
-A POSTROUTING -s 10.0.0.0/24 -o ens3 -j MASQUERADE
COMMIT
```

> Replace `ens3` with your actual public network interface if different (check with `ip a`).

### 4. Restart UFW:

```
ufw disable
ufw enable
```

Verify:

```
ufw status verbose
```

## Starting WireGuard

Start and enable WireGuard:

```
systemctl start wg-quick@wg0
systemctl enable wg-quick@wg0
```

Check status:

```
wg
```

## Final Notes

Now your WireGuard server is running, secure, and your SSH access is preserved. You can connect from a configured client to `10.0.0.1` via WireGuard.
