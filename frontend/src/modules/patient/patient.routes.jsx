import React from 'react';
import PatientListPage from './pages/PatientListPage';
import MedicalRecordPage from './pages/MedicalRecordPage';

export const patientRoutes = [
  { path: 'patients', element: <PatientListPage /> },
  { path: 'patients/records', element: <MedicalRecordPage /> },
];
