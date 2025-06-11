import { EmailStatus } from './types';

export interface SendEmail {
    id: number;
    user_id: number;
    email: string;
    subject: string;
    message: string;
    sent_at: Date;
    status: EmailStatus;
}

export interface CreateSendEmail {
    user_id: number;
    email: string;
    subject: string;
    message: string;
    status: EmailStatus;
}
