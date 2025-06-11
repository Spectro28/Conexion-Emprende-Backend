import { ProviderType } from '../types/auth';

export interface AuthMethod {
    id: number;
    user_id: number;
    provider: ProviderType;
    provider_id: string;
    created_at: Date;
}

export interface CreateAuthMethod {
    user_id: number;
    provider: ProviderType;
    provider_id: string;
}
