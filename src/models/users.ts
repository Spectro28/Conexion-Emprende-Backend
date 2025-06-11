import { ProfileType } from './types';

export interface User {
    id: number;
    full_name: string;
    email: string;
    password: string;
    perfil: ProfileType;
    is_verified: boolean;
    created_at: Date;
}

export interface CreateUser {
    full_name: string;
    email: string;
    password: string;
    perfil?: ProfileType | null;
}
