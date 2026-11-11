const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

// Import routes theo từng domain nghiệp vụ
const authRoutes = require('./modules/auth/auth.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const patientRoutes = require('./modules/patient/patient.routes');
const clinicalRoutes = require('./modules/clinical/clinical.routes');
const lesionRoutes = require('./modules/lesion/lesion.routes');

const app = express();

// Middlewares toàn cục
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Gắn các tuyến đường API
app.use('/api/auth', authRoutes);                  // Chuẩn theo Google Sheets & đề bài
app.use('/api/v1/auth', authRoutes);               // Tương thích ngược phiên bản v1
app.use('/api/v1/admin', adminRoutes);         // Slide 3 & 4 (Admin, Topology, Phòng khám)
app.use('/api/v1/patients', patientRoutes);    // Slide 5 (Bệnh nhân & Hồ sơ bệnh án)
app.use('/api/v1/clinical', clinicalRoutes);   // Slide 6 & 7 (Lâm sàng, Đơn thuốc, UAS7)
app.use('/api/v1/lesions', lesionRoutes);      // Slide 8, 9, 10, 11 (Tổn thương da, Ảnh, Supabase)

// Xử lý lỗi tập trung
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
