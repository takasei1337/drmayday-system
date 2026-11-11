import React from 'react';
import ClinicalExaminationPage from './pages/ClinicalExaminationPage';
import PrescriptionPage from './pages/PrescriptionPage';
import Uas7TrackingPage from './pages/Uas7TrackingPage';

export const clinicalRoutes = [
  { path: 'clinical/exams', element: <ClinicalExaminationPage /> },
  { path: 'clinical/prescriptions', element: <PrescriptionPage /> },
  { path: 'clinical/uas7', element: <Uas7TrackingPage /> },
];
