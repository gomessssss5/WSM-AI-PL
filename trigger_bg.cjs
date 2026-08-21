const http = require('http');

const data = JSON.stringify({
  userId: "user-123",
  taskId: "task-123",
  taskData: {
    scheduleType: "once",
    prompt: "Auditoria Omnix — teste de agendamento"
  }
});

const req = http.request({
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/scheduled-tasks/execute-now',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'x-internal-secret': 'OmnixInternalSchedulerBypassToken_2026'
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', e => console.error('Error:', e));
req.write(data);
req.end();
