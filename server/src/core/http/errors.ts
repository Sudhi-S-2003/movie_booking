import ApiError from '../../services/error/ApiError.js';
import { ERROR_CODES, HTTP_STATUS } from '../../services/error/error.constant.js';

export { ApiError };

/** Factory helpers so services throw consistent, typed HTTP errors. */
export const Errors = {
  badRequest: (message: string, details?: unknown) => new ApiError(HTTP_STATUS.BAD_REQUEST, message, ERROR_CODES.BAD_REQUEST, details),
  unauthorized: (message = 'Authentication required') => new ApiError(HTTP_STATUS.UNAUTHORIZED, message, ERROR_CODES.UNAUTHORIZED),
  forbidden: (message = 'You do not have permission to perform this action') => new ApiError(HTTP_STATUS.FORBIDDEN, message, ERROR_CODES.FORBIDDEN),
  notFound: (what = 'Resource') => new ApiError(HTTP_STATUS.NOT_FOUND, `${what} not found`, ERROR_CODES.NOT_FOUND),
  conflict: (message: string) => new ApiError(HTTP_STATUS.CONFLICT, message, ERROR_CODES.CONFLICT),
  /** 402: prepaid balance or postpaid credit limit exhausted. */
  paymentRequired: (message: string, details?: unknown) => new ApiError(402, message, 'INSUFFICIENT_FUNDS', details),
  serviceUnavailable: (message: string) => new ApiError(403, message, 'SERVICE_NOT_ENABLED'),
};
