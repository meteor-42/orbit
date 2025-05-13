/* 
На Uniswap V3:
    amount0 — изменение баланса токена0 (ARB)
    amount1 — изменение баланса токена1 (USDC)
    Отрицательное значение — выдача (out)
    Положительное значение — получение (in)
    Покупка ARB за USDC — это когда:
    amount0 > 0 (вы получаете ARB)
    amount1 < 0 (вы отдаёте USDC) 
*/

const { ethers } = require("ethers");
const https = require("https");

const BOT_TOKEN = "7714855475:AAEvwROBO5tfpHqLEd8CTMoOfwy08lEdvzo";
const CHAT_ID = "-1002522849408";

const WS_URL = "wss://arbitrum-one-rpc.publicnode.com";
const provider = new ethers.providers.WebSocketProvider(WS_URL);

const POOL_ADDRESS = "0xC6962004f452bE9203591991D15f6b388e09E8D0"; // ETH/USDC Pool
const POOL_ABI = [
  "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
];

const contract = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider);

console.log("📡 Подключен к WebSocket для событий Swap на пуле ARB/USDC...");

function sendToTelegram(message) {
  const data = JSON.stringify({
    chat_id: CHAT_ID,
    text: message,
    parse_mode: "HTML" // Используем HTML вместо Markdown
  });

  const options = {
    hostname: "api.telegram.org",
    path: `/bot${BOT_TOKEN}/sendMessage`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length
    }
  };

  const req = https.request(options, res => {
    if (res.statusCode !== 200) {
      console.error(`❌ Ошибка Telegram: ${res.statusCode}`);
    }
  });

  req.on("error", error => {
    console.error("❌ Ошибка отправки в Telegram:", error);
  });

  req.write(data);
  req.end();
}

contract.on("Swap", (sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick, event) => {
  try {
    const amount0Float = parseFloat(ethers.utils.formatUnits(amount0, 18));
    const amount1Float = parseFloat(ethers.utils.formatUnits(amount1, 6));

    // Покупка ARB за USDC
    if (amount0.gt(0) && amount1.lt(0) && Math.abs(amount1Float) >= 100000) {
      const txHash = event.transactionHash;
      const arbiscanLink = `https://arbiscan.io/tx/${txHash}`;

      const log = `
✅ Swap:
🔸 Sender:     ${sender}
🔸 Recipient:  ${recipient}
🔸 amount0:    ${amount0Float.toFixed(4)} ETH
🔸 amount1:    ${amount1Float.toFixed(2)} USDC
🔸 Tick:       ${tick}
🔗 Tx Hash:    ${txHash}
🔗 Arbiscan:   ${arbiscanLink}
      `;
      console.log(log);

      // Сообщение в Telegram
      const tgMessage = `
✅ Swap Alert
🔸 Sender: ${sender}
🔸 Recipient: ${recipient}
🔸 amount0: ${amount0Float.toFixed(4)} ETH
🔸 amount1: ${amount1Float.toFixed(2)} USDC
`;

      sendToTelegram(tgMessage);
    }
  } catch (err) {
    console.error("❌ Ошибка при обработке события:", err.message);
  }
});