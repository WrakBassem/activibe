const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEFAULT_TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramMessage(text: string, chatId?: string | number) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('⚠️ Telegram credentials not set in .env');
    return;
  }

  const targetChatId = chatId || DEFAULT_TELEGRAM_CHAT_ID;
  if (!targetChatId) {
    console.warn('⚠️ No Telegram Chat ID provided');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: text,
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      console.error('❌ Telegram API Error:', data);
    } else {
      console.log(`✅ Telegram message sent to ${targetChatId}.`);
    }
  } catch (error) {
    console.error('❌ Failed to send Telegram message:', error);
  }
}
