import { Router, Request, Response, NextFunction } from "express";
import postgres from "postgres";

const route = Router();

export class CustomError extends Error {
    statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.name = "CustomError";
    }
}

const handlePostgresError = (error: postgres.PostgresError) => {
    switch (error.code) {
        case "23503": // Foreign key violation
            return {
                statusCode: 400,
                message: "Referenced resource not found or cannot be modified due to existing references",
            };
        case "23505": // Unique violation
            return {
                statusCode: 409,
                message: "Resource already exists",
            };
        case "23514": // Check violation
            return {
                statusCode: 400,
                message: "Invalid data: Constraint check failed",
            };
        case "42P01": // Undefined table
            return {
                statusCode: 500,
                message: "Database configuration error",
            };
        case "28P01": // Invalid auth
            return {
                statusCode: 500,
                message: "Database authentication error",
            };
        default:
            return {
                statusCode: 500,
                message: "Database error occurred",
            };
    }
};

route.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Error details: ", {
        name: error.name,
        message: error.message,
        code: error instanceof postgres.PostgresError ? error.code : undefined,
        stack: error.stack,
    });
    // Handle Postgres errors
    if (error instanceof postgres.PostgresError) {
        const { statusCode, message } = handlePostgresError(error);
        res.status(statusCode).json({ message });
        return;
    }
    // Handle custom errors
    if (error instanceof CustomError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
    }
    // Handle other errors
    res.status(500).json({ message: error.message || "Internal server error" });
});

route.use((_, res) => {
    res.status(400).json({ message: "Invalid endpoint or method" });
});

export default route;
