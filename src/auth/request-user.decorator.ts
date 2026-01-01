import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from './interfaces/request-user.interface';

export const ReqUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): RequestUser => {
        const request = ctx.switchToHttp().getRequest();
        return request.user; // Passport puts the data here
    },
);
