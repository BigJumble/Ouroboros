export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface Message {
    userName: string;
    message: string;
    date: Date;
}

export const MessageExample: Message = {
    userName: "",
    message: "",
    date: new Date()
}
