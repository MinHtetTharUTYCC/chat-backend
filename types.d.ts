import { RequestUser } from './src/auth/interfaces/request-user.interface';

declare module 'express' {
    interface Request {
        user: RequestUser;
    }
}
