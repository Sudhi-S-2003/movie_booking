import ApiError from "./ApiError.js";
import { HTTP_STATUS, ERROR_CODES } from "./error.constant.js";

class ErrorService {

    badRequest = (message = "Bad Request", details?: unknown): ApiError =>
        new ApiError(HTTP_STATUS.BAD_REQUEST, message, ERROR_CODES.BAD_REQUEST, details);

    unauthorized = (message = "Unauthorized", details?: unknown): ApiError =>
        new ApiError(HTTP_STATUS.UNAUTHORIZED, message, ERROR_CODES.UNAUTHORIZED, details);

    forbidden = (message = "Forbidden", details?: unknown): ApiError =>
        new ApiError(HTTP_STATUS.FORBIDDEN, message, ERROR_CODES.FORBIDDEN, details);

    notFound = (message = "Not Found", details?: unknown): ApiError =>
        new ApiError(HTTP_STATUS.NOT_FOUND, message, ERROR_CODES.NOT_FOUND, details);

    conflict = (message = "Conflict", details?: unknown): ApiError =>
        new ApiError(HTTP_STATUS.CONFLICT, message, ERROR_CODES.CONFLICT, details);

    validation = (message = "Validation Error", details?: unknown): ApiError =>
        new ApiError(HTTP_STATUS.VALIDATION, message, ERROR_CODES.VALIDATION_ERROR, details);

    internal = (message = "Internal Server Error", details?: unknown): ApiError =>
        new ApiError(HTTP_STATUS.INTERNAL, message, ERROR_CODES.INTERNAL_ERROR, details);

}

export default new ErrorService();