export interface TempToken {
    id: number;
    email: string;
    token: string;
    expires_at: Date;
    created_at: Date;
}

export interface CreateTempToken {
    email: string;
    token: string;
    expires_at: Date;
}
