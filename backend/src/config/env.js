const path = require('path');
const dotenv = require('dotenv');

// 1. Ưu tiên đọc file .env tổng ở thư mục gốc của hệ thống (drmayday-system/.env)
const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });

// 2. Dự phòng: nếu có file .env bên trong thư mục backend/ thì ghi đè bổ sung
dotenv.config();

module.exports = process.env;
