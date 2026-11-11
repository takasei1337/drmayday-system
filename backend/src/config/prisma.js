require('./env');
const { PrismaClient } = require('@prisma/client');

// Chuẩn hóa để JSON.stringify có thể serialize được kiểu BigInt từ Prisma
BigInt.prototype.toJSON = function () {
  return this.toString();
};

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Tránh tạo nhiều connection trong môi trường hot-reload development
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  prisma = global.prisma;
}

module.exports = prisma;
