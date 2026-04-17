import { SupportPage } from '../../../components/dashboard/index.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';

export const UserSupport = () => {
  useDocumentTitle('Support Hub — CinemaConnect');
  return <SupportPage />;
};
