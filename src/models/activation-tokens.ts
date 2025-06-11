
export interface ActivationToken {
    id: number;
    user_id: number;
    token: string;
    expires_at: Date;
    used: boolean;
    created_at: Date;
}

export interface CreateActivationToken {
    user_id: number;
    token: string;
    expires_at: Date;
}
