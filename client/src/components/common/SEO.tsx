import React from 'react';
import { useDocumentHeader } from '../../hooks/useDocumentHeader';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
}

/**
 * SEO Component
 * Use this at the top of page components to manage document metadata.
 */
export const SEO: React.FC<SEOProps> = (props) => {
  useDocumentHeader(props);
  return null;
};
