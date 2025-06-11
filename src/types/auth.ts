import { User, CreateUser } from '../models/users';
import { Profile, CreateProfile } from '../models/profiles';
import { AuthMethod, CreateAuthMethod } from '../models/auth-methods';
import { ActivationToken, CreateActivationToken } from '../models/activation-tokens';
import { SendEmail, CreateSendEmail } from '../models/send-emails';
export enum ProviderType {
    GOOGLE = 'google',
    FACEBOOK = 'facebook',
    APPLE = 'apple',
    EMAIL = 'email'
}

export type AuthResponse = {
    message: string;
    token?: string;
    user?: User;
};

export type AuthError = {
    error: string;
};
