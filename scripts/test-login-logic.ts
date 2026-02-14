import 'dotenv/config';
import postgres from 'postgres';
import { compare } from 'bcrypt';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const sql = postgres(connectionString!, { ssl: 'require' });

async function verifyLoginLogic() {
  const email = `login-test-${Date.now()}@example.com`;
  const password = 'password123';
  const name = 'Login Test User';

  try {
     // 1. Register User (using the API we verified, or direct DB insert)
     // Let's use direct DB insert to match what the register route does, but ensuring we know the input.
     // Actually, let's just use the register API to be more integration-test like.
    const regRes = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
    });

    if (!regRes.ok) {
        throw new Error(`Registration failed: ${regRes.status}`);
    }
    console.log('User registered for login test.');

    // 2. Fetch User from DB
    const users = await sql`SELECT * FROM users WHERE email = ${email}`;
    const user = users[0];

    if (!user) {
        throw new Error('User not found in DB after registration.');
    }
    console.log('User found in DB.');

    // 3. Verify Password
    const isValid = await compare(password, user.password_hash);

    if (isValid) {
        console.log('Password verification SUCCESSFUL.');
    } else {
        console.error('Password verification FAILED.');
    }

  } catch (error) {
    console.error('Error verifying login logic:', error);
  } finally {
    await sql.end();
  }
}

verifyLoginLogic();
