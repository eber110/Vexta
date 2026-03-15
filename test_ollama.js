const http = require('http');

const data = JSON.stringify({
  model: 'qwen3.5:4b',
  messages: [{ role: 'user', content: '¿Qué es la relatividad? Piensa paso a paso.' }],
  stream: false
});

const options = {
  hostname: '127.0.0.1',
  port: 11434,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('--- OLLAMA RESPONSE ---');
    console.log(body);
    try {
        const parsed = JSON.parse(body);
        console.log('\n--- MESSAGE OBJECT ---');
        console.log(JSON.stringify(parsed.message, null, 2));
    } catch(e) {
        console.log('Error parsing JSON');
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
