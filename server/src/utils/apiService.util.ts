import { signApiService } from './signature.util.js';
import { env } from '../env.js';
import { ApiServiceCategory } from '../constants/enums.js';

/**
 * Internal helper to generate signed URL data for a resource.
 */
export const generateSignedUrlData = (resourceId: string, category: string, expiryMinutes?: number) => {
  const ttlMinutes = typeof expiryMinutes === 'number' ? expiryMinutes : 15;
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;

  let path = '';
  switch (category) {
    case ApiServiceCategory.CODE_SHARE:
      path = `/code-share/${resourceId}`;
      break;
    case ApiServiceCategory.CODE_SHARE_V2:
      path = `/code-share-v2/${resourceId}`;
      break;
    default:
      throw new Error(`Category '${category}' is not supported for dynamic signing yet`);
  }

  const signature = signApiService(resourceId, category, expiresAt);
  const signedUrl = `${env.FRONTEND_URL}${path}?signature=${signature}&expiresAt=${expiresAt}&category=${category}`;

  return { signedUrl, expiresAt, signature };
};
