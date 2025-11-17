import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class WSJwtGuard implements CanActivate {
    constructor(private jwt: JwtService) { }

    canActivate(context: ExecutionContext): boolean {
        const client = context.switchToWs().getClient();
        // const token = client.handshake.headers.authorizations?.split(' ')[1];
        const token = client.handshake.auth?.token;

        if (!token) {
            throw new UnauthorizedException('Missing token');
        }

        try {
            const payload = this.jwt.verify(token, { secret: process.env.JWT_ACCESS_SECRET });

            //attach user to client.data(official place)
            client.data.user = { sub: payload.sub }

            return true;

        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }

    getRequest(context: ExecutionContext) {
        return context.switchToWs().getClient().handshake;
    }
}