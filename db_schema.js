const fs = require('fs');
const { neon } = require('@neondatabase/serverless');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=(.+)/);

if (match) {
  const db = neon(match[1]);
  db("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'")
    .then(console.log)
    .catch(console.error);
}
