const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('./config/env');

const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

// Import routes theo từng domain nghiệp vụ
const authRoutes = require('./modules/auth/auth.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const adminRbacRoutes = require('./modules/admin/adminRbac.routes');
const topologyRoutes = require('./modules/admin/topology.routes');
const templatesRoutes = require('./modules/templates/templates.routes');
const patientRoutes = require('./modules/patient/patient.routes');
const { mountPatientFlowRoutes } = require('./modules/patient/patientFlow.routes');
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

// Gắn các tuyến đường API (hỗ trợ cả /api và /api/v1 theo chuẩn GoogleSheets_APIs.xlsx)
app.use('/api/auth', authRoutes);                  // Chuẩn theo Google Sheets & đề bài
app.use('/api/v1/auth', authRoutes);               // Tương thích ngược phiên bản v1

app.use('/api', adminRbacRoutes);
app.use('/api/v1', adminRbacRoutes);

app.use('/api', topologyRoutes);
app.use('/api/v1', topologyRoutes);

app.use('/api/templates', templatesRoutes);
app.use('/api/v1/templates', templatesRoutes);

app.use('/api/v1/admin', adminRoutes);             // Slide 3 & 4 (Admin, Topology, Phòng khám)
app.use('/api/v1/patients', patientRoutes);        // Slide 5 (Bệnh nhân & Hồ sơ bệnh án)
app.use('/api/v1/patient-mgmt', patientRoutes);    // Alias tương thích Bruno của drmayday-system
mountPatientFlowRoutes(app);                       // Toàn bộ quy trình Backend Bệnh nhân (Slides 1,2,5,6,7,8,9,11)
app.use('/api/v1/clinical', clinicalRoutes);       // Slide 6 & 7 (Lâm sàng, Đơn thuốc, UAS7)
app.use('/api/v1/lesions', lesionRoutes);          // Slide 8, 9, 10, 11 (Tổn thương da, Ảnh, Supabase)

// Xử lý lỗi tập trung
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
