require('dotenv').config();
console.log('Checking AUTH_SECRET...');
if (process.env.AUTH_SECRET) {
    console.log('✅ AUTH_SECRET is defined and has length:', process.env.AUTH_SECRET.length);
} else {
    console.log('❌ AUTH_SECRET is MISSING');
}
