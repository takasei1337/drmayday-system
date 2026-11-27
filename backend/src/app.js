const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

// Import routes theo từng domain nghiệp vụ
const authRoutes = require('./modules/auth/auth.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const adminRbacRoutes = require('./modules/admin/adminRbac.routes');
const topologyRoutes = require('./modules/admin/topology.routes');
const templatesRoutes = require('./modules/templates/templates.routes');
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

// Gắn các tuyến đường API (hỗ trợ cả /api và /api/v1 theo chuẩn GoogleSheets_APIs.xlsx)
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);

app.use('/api', adminRbacRoutes);
app.use('/api/v1', adminRbacRoutes);

app.use('/api', topologyRoutes);
app.use('/api/v1', topologyRoutes);

app.use('/api/templates', templatesRoutes);
app.use('/api/v1/templates', templatesRoutes);

app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/clinical', clinicalRoutes);
app.use('/api/v1/lesions', lesionRoutes);

// Xử lý lỗi tập trung
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
