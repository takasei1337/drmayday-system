import React from 'react';
import LesionUploadPage from './pages/LesionUploadPage';
import LesionGalleryPage from './pages/LesionGalleryPage';
import DynamicFormPage from './pages/DynamicFormPage';

export const lesionRoutes = [
  { path: 'lesions/upload', element: <LesionUploadPage /> },
  { path: 'lesions/gallery', element: <LesionGalleryPage /> },
  { path: 'lesions/forms', element: <DynamicFormPage /> },
];
