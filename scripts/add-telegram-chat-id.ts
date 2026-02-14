import 'dotenv/config';
import postgres from 'postgres';

const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL)?.replace(':6543', ':5432');
const sql = postgres(connectionString!, { ssl: 'require' });

async function addTelegramChatId() {
  try {
    console.log('Checking for telegram_chat_id column...');
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_profile' AND column_name = 'telegram_chat_id'
    `;

    if (columns.length === 0) {
      console.log('Adding telegram_chat_id column...');
      await sql`ALTER TABLE user_profile ADD COLUMN telegram_chat_id TEXT`;
      console.log('Column added.');
      
      // Optional: Migrate existing env var to the default user if we want
      const defaultChatId = process.env.TELEGRAM_CHAT_ID;
      if (defaultChatId) {
          console.log(`Assigning default chat ID ${defaultChatId} to ourakbassem6@gmail.com...`);
          // Find user ID
           const users = await sql`SELECT id FROM users WHERE email = 'ourakbassem6@gmail.com'`;
           if (users.length > 0) {
               await sql`
                UPDATE user_profile 
                SET telegram_chat_id = ${defaultChatId}
                WHERE user_id = ${users[0].id}
               `;
               console.log('Default chat ID assigned.');
           }
      }

    } else {
      console.log('telegram_chat_id column already exists.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

addTelegramChatId();
