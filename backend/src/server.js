const app = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 DRMAYDAY BACKEND SERVER ĐANG CHẠY TẠI PORT: ${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
  console.log(`💡 Bruno Testing: Xem thư mục 'bruno/' để test độc lập`);
  console.log(`=======================================================`);
});
