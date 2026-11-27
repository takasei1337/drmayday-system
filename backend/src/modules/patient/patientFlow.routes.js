const express = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { errorResponse } = require('../../common/response');
const authController = require('../auth/auth.controller');
const patientController = require('./patient.controller');
const flowController = require('./patientFlow.controller');

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      const err = new Error('Định dạng tệp không được hỗ trợ (chỉ chấp nhận JPEG, PNG, WEBP, GIF, PDF)');
      err.code = 1004;
      err.statusCode = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

const uploadSingleMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const code = err.code === 'LIMIT_FILE_SIZE' ? 1006 : (err.code || 1004);
      return errorResponse(res, err.message, err.statusCode || 400, code, err);
    }
    return next();
  });
};

const uploadMultipleMiddleware = (req, res, next) => {
  upload.array('images', 10)(req, res, (err) => {
    if (err) {
      const code =
        err.code === 'LIMIT_FILE_SIZE'
          ? 1006
          : (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT' ? 1008 : err.code || 1004);
      return errorResponse(res, err.message, err.statusCode || 400, code, err);
    }
    return next();
  });
};

/**
 * Gắn tất cả các tuyến đường chuẩn theo 11 Slide & API Master Spec cho Backend Bệnh nhân
 */
function mountPatientFlowRoutes(app) {
  // 1. Hồ sơ cá nhân (/api/v1/profile, /api/profile, /api/v1/users/profile)
  const profileRouter = express.Router();
  profileRouter.use(authenticate);
  profileRouter.get('/', authController.getMe);
  profileRouter.put('/', authController.updateMe);
  profileRouter.patch('/', authController.updateMe);
  app.use('/api/v1/profile', profileRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/v1/users/profile', profileRouter);

  // 2. Sàng lọc báo động đỏ (/api/v1/red-flag-screening)
  const redFlagRouter = express.Router();
  redFlagRouter.use(authenticate);
  redFlagRouter.post('/', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.submitRedFlag);
  redFlagRouter.get('/', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.listRedFlags);
  redFlagRouter.get('/:id', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getRedFlagById);
  app.use('/api/v1/red-flag-screening', redFlagRouter);
  app.use('/api/red-flag-screening', redFlagRouter);

  // 3. Bác sĩ quản lý bệnh nhân (docpat01, docpat02)
  const doctorPatientRouter = express.Router();
  doctorPatientRouter.use(authenticate);
  doctorPatientRouter.get('/', authorize(['ADMIN', 'BAC_SI', 'DIEU_DUONG']), patientController.getDoctorPatients);
  doctorPatientRouter.get('/:id', authorize(['ADMIN', 'BAC_SI', 'DIEU_DUONG']), patientController.getDoctorPatientDetail);
  app.use('/api/v1/doctor/patients', doctorPatientRouter);
  app.use('/api/doctor/patients', doctorPatientRouter);

  // 4. Templates động trên Sub DB (/api/v1/templates)
  const templateRouter = express.Router();
  templateRouter.use(authenticate);
  templateRouter.get('/all', flowController.listTemplates);
  templateRouter.get('/', flowController.listTemplates);
  templateRouter.get('/:id', flowController.getTemplate);
  app.use('/api/v1/templates', templateRouter);

  // 5. Hồ sơ bệnh án (/api/v1/medical_records & /api/v1/medical-records) - medrec01..14
  const medRecRouter = express.Router();
  medRecRouter.use(authenticate);
  medRecRouter.get('/classify-questions', flowController.getClassifyQuestions);
  medRecRouter.post('/classify', flowController.classifyRecord);
  medRecRouter.get('/all', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.listRecords);
  medRecRouter.get('/patients/:patientId/history', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getPatientRecordHistory);
  medRecRouter.post('/', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.createRecord);
  medRecRouter.get('/', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.listRecords);
  medRecRouter.get('/:id/summary', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getRecordSummary);
  medRecRouter.get('/:id/history', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getRecordHistory);
  medRecRouter.get('/:id/answers', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getAnswers);
  medRecRouter.post('/:id/answer', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.addAnswerSingular);
  medRecRouter.post('/:id/answers', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.upsertAnswers);
  medRecRouter.put('/:id/answers', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.upsertAnswers);
  medRecRouter.post('/:id/close', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.closeRecord);
  medRecRouter.post('/:id/accept', authorize(['BAC_SI', 'ADMIN']), flowController.acceptRecord);
  medRecRouter.post('/:id/complete', authorize(['BAC_SI', 'ADMIN']), flowController.completeRecord);
  medRecRouter.patch('/:id/status', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.updateRecordStatus);
  medRecRouter.get('/:id/sessions', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getRecordSessions);
  medRecRouter.post('/:id/sessions', authorize(['BAC_SI', 'ADMIN']), flowController.createRecordSession);
  medRecRouter.get('/:id/lab-results', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getLabResults);
  medRecRouter.get('/:id/prescriptions', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getPrescriptions);
  medRecRouter.get('/:id', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getRecordDetail);
  medRecRouter.put('/:id', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.updateRecord);
  medRecRouter.patch('/:id', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.updateRecord);
  medRecRouter.delete('/:id', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.deleteRecord);
  app.use('/api/v1/medical_records', medRecRouter);
  app.use('/api/v1/medical-records', medRecRouter);
  app.use('/api/medical_records', medRecRouter);
  app.use('/api/medical-records', medRecRouter);

  // 6. Cận lâm sàng & Đơn thuốc (medrec12, medrec13)
  const labReqRouter = express.Router();
  labReqRouter.use(authenticate);
  labReqRouter.post('/', authorize(['BAC_SI', 'ADMIN']), flowController.createLabRequest);
  app.use('/api/v1/lab-requests', labReqRouter);
  app.use('/api/lab-requests', labReqRouter);

  const labRouter = express.Router();
  labRouter.use(authenticate);
  labRouter.post('/', authorize(['BAC_SI', 'ADMIN']), flowController.createLabResult);
  labRouter.get('/record/:recordId', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getLabResults);
  labRouter.get('/', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getLabResults);
  labRouter.get('/:recordId', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getLabResults);
  app.use('/api/v1/lab-results', labRouter);
  app.use('/api/lab-results', labRouter);

  const rxRouter = express.Router();
  rxRouter.use(authenticate);
  rxRouter.post('/', authorize(['BAC_SI', 'ADMIN']), flowController.createPrescription);
  rxRouter.get('/record/:recordId', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getPrescriptions);
  rxRouter.get('/', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getPrescriptions);
  rxRouter.get('/:recordId', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getPrescriptions);
  app.use('/api/v1/prescriptions', rxRouter);
  app.use('/api/prescriptions', rxRouter);

  // 7. Theo dõi UAS7 & AAS (Slide 7)
  const uas7Router = express.Router();
  uas7Router.use(authenticate);
  uas7Router.post('/', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.logUas7);
  uas7Router.get('/eligibility', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.checkUas7Eligibility);
  uas7Router.get('/summary', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getUas7);
  uas7Router.get('/week/:patientId', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getUas7Week);
  uas7Router.get('/patient/:patientId', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getUas7);
  uas7Router.get('/', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getUas7);
  app.use('/api/v1/uas7-scores', uas7Router);
  app.use('/api/uas7-scores', uas7Router);

  const aasRouter = express.Router();
  aasRouter.use(authenticate);
  aasRouter.post('/', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.logAas);
  aasRouter.get('/', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getAas);
  app.use('/api/v1/aas-scores', aasRouter);
  app.use('/api/aas-scores', aasRouter);

  // 8. Đợt tổn thương, Vị trí, Ảnh, Supabase Storage & Ảnh câu trả lời (Slide 8 & 9)
  const epRouter = express.Router();
  epRouter.use(authenticate);
  epRouter.post('/', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.createEpisode);
  epRouter.get('/my', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.listEpisodes);
  epRouter.get('/record/:medicalRecordId', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.listEpisodesByRecord);
  epRouter.get('/', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.listEpisodes);
  epRouter.get('/:id', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.getEpisodeById);
  epRouter.patch('/:id', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.updateEpisode);
  epRouter.put('/:id', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.updateEpisode);
  epRouter.delete('/:id', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.deleteEpisode);
  app.use('/api/v1/lesion-episodes', epRouter);
  app.use('/api/lesion-episodes', epRouter);

  const locRouter = express.Router();
  locRouter.use(authenticate);
  locRouter.post('/', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.createLocation);
  locRouter.get('/episode/:episodeId', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.listLocations);
  locRouter.get('/', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.listLocations);
  locRouter.patch('/:id', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.updateLocation);
  locRouter.put('/:id', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.updateLocation);
  locRouter.delete('/:id', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.deleteLocation);
  app.use('/api/v1/lesion-locations', locRouter);
  app.use('/api/lesion-locations', locRouter);

  app.get('/api/v1/image-attachments/view/:id', flowController.viewAttachmentBinary);
  app.get('/api/image-attachments/view/:id', flowController.viewAttachmentBinary);
  const attachRouter = express.Router();
  attachRouter.use(authenticate);
  attachRouter.post('/upload', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), uploadSingleMiddleware, flowController.uploadAttachment);
  attachRouter.post('/upload-multiple', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), uploadMultipleMiddleware, flowController.uploadMultipleAttachments);
  attachRouter.get('/user/:userId', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.listAttachments);
  attachRouter.get('/', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.listAttachments);
  attachRouter.delete('/:id', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.deleteAttachment);
  app.use('/api/v1/image-attachments', attachRouter);
  app.use('/api/image-attachments', attachRouter);

  const photoRouter = express.Router();
  photoRouter.use(authenticate);
  photoRouter.post('/', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.createPhoto);
  photoRouter.get('/location/:locationId', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.listPhotos);
  photoRouter.get('/', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.listPhotos);
  photoRouter.patch('/:id/milestone', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.updatePhotoMilestone);
  photoRouter.delete('/:id', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.deletePhoto);
  app.use('/api/v1/lesion-photos', photoRouter);
  app.use('/api/lesion-photos', photoRouter);

  const ansImgRouter = express.Router();
  ansImgRouter.use(authenticate);
  ansImgRouter.post('/bulk', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.attachAnswerImagesBulk);
  ansImgRouter.post('/', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.attachAnswerImage);
  ansImgRouter.get('/', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.listAnswerImages);
  ansImgRouter.get('/:answerId', authorize(['BENH_NHAN', 'BAC_SI', 'DIEU_DUONG', 'ADMIN']), flowController.listAnswerImages);
  ansImgRouter.delete('/:id', authorize(['BENH_NHAN', 'BAC_SI', 'ADMIN']), flowController.deleteAnswerImage);
  app.use('/api/v1/answer-images', ansImgRouter);
  app.use('/api/answer-images', ansImgRouter);
}

module.exports = { mountPatientFlowRoutes };

