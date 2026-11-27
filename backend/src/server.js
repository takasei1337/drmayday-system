const http = require('http');
require('./config/env');
const app = require('./app');

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '127.0.0.1';

const server = http.createServer(app);

server.on('error', (err) => {
  console.error(`❌ Không thể khởi động Backend tại ${HOST}:${PORT}:`, err.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🚀 DRMAYDAY BACKEND SERVER ĐANG CHẠY TẠI: http://${HOST}:${PORT}`);
  console.log(`🔗 API Base URL: http://${HOST}:${PORT}/api/v1`);
  console.log(`💡 Bruno Testing: Xem thư mục 'bruno/' để test độc lập`);
  console.log(`=======================================================`);
});
