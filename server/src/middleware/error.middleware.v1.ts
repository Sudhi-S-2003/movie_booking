import type { Request, Response, NextFunction } from "express";
import ApiError from "../services/error/ApiError.js";
import { HTTP_STATUS, ERROR_CODES } from "../services/error/error.constant.js";

const errorMiddleware = (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {

    if (err instanceof ApiError) {

        return res.status(err.statusCode).json({
            success: false,
            code: err.code,
            message: err.message,
            details: err.details,
            stack:
                process.env.NODE_ENV === "development"
                    ? err.stack
                    : undefined
        });

    }

    console.error("UNKNOWN ERROR:", err);

    return res.status(HTTP_STATUS.INTERNAL).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: "Internal Server Error"
    });

};

export default errorMiddleware;