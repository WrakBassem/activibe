// Use global fetch (Node 18+)

async function testSession() {
  const BASE_URL = 'http://localhost:3000/api/coach';
  
  console.log('1. Starting new session...');
  const res1 = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: "Hello, I'm testing a new session." })
  });
  
  const data1 = await res1.json();
  console.log('Response 1:', data1.success ? 'Success' : 'Failed', data1.sessionId);
  
  if (!data1.sessionId) {
    console.error('No sessionId returned, cannot continue test');
    console.log(JSON.stringify(data1, null, 2));
    return;
  }

  const sessionId = data1.sessionId;
  
  console.log(`\n2. Continuing session ${sessionId}...`);
  const res2 = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message: "I am continuing the session. Do you remember me?", 
      sessionId: sessionId 
    })
  });
  
  const data2 = await res2.json();
  console.log('Response 2:', data2.success ? 'Success' : 'Failed');
  if (!data2.success) {
    console.log('Error details:', JSON.stringify(data2, null, 2));
  } else {
    console.log('AI Reply:', data2.response.substring(0, 50) + '...');
  }
}

testSession();
