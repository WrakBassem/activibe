import 'dotenv/config';

async function testRegistration() {
  const email = `test-${Date.now()}@example.com`;
  const password = 'password123';
  const name = 'Test User';

  console.log('Testing registration with email:', email);

  try {
    const response = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();
    console.log('Registration Status:', response.status);
    console.log('Registration Response:', data);

    if (response.ok) {
        console.log('Registration successful!');
    } else {
        console.error('Registration failed.');
    }

  } catch (error) {
    console.error('Error testing registration:', error);
  }
}

testRegistration();
