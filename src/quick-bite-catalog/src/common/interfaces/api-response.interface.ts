export interface ApiResponse<T> {
    success: boolean;
    statusCode: number;
    message: string | string[];
    data?: T;
    errors?: unknown;
    timestamp: string;
    path: string;
}