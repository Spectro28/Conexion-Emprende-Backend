
export interface Profile {
    id: number;
    user_id: number;
    bio: string;
    avatar_url: string;
    phone: string;
    created_at: Date;
}

export interface CreateProfile {
    user_id: number;
    bio?: string;
    avatar_url?: string;
    phone?: string;
}
