import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from './interfaces/auth.interfaces';

interface RequestWithUser extends Request {
    user: RequestUser;
}
export const ReqUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): RequestUser => {
        const request = ctx.switchToHttp().getRequest<RequestWithUser>();
        // if (!request.user) {
        //     throw new Error(
        //         'ReqUser decorator: request.user is undefined. Is the AuthGuard applied?',
        //     );
        // }
        return request.user;
    },
);
