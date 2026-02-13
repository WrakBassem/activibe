
// Use global fetch (Node 18+)

async function testCron() {
  const BASE_URL = 'http://localhost:3000/api/cron/daily';
  const CRON_SECRET = 'Bassem1919@90600663'; // Matches .env

  console.log('--- Testing Morning Phase ---');
  try {
    const res = await fetch(`${BASE_URL}?phase=morning`, {
      headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
    });
    const data = await res.json();
    console.log('Morning Result:', data);
  } catch (e) {
    console.error('Morning Error:', e);
  }

  console.log('\n--- Testing Evening Phase ---');
  try {
    const res = await fetch(`${BASE_URL}?phase=evening`, {
      headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
    });
    const data = await res.json();
    console.log('Evening Result:', data);
  } catch (e) {
    console.error('Evening Error:', e);
  }
}

testCron();
