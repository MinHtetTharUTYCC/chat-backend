import { RequestUser } from '../auth/interfaces/request-user.interface';

declare global {
    namespace Express {
        interface Request {
            user?: RequestUser;
        }
    }
}
