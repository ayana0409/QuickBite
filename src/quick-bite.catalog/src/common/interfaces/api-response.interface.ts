export class ApiResponse<T> {
    success!: boolean;
    message!: string;
    data?: T;
    errors?: any;
    timestamp!: string;
    path!: string;
}