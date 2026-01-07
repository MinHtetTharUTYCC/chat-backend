import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RequestUser } from '../interfaces/auth.interfaces';
import { JwtPayloadOutput } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || '',
        });
    }

    // called after the token is verified and decoded
    // The decoded token payload is passed as the first argument
    validate(payload: JwtPayloadOutput): RequestUser {
        // this returned value is attached to the Request object as req.user
        return { sub: payload.sub, username: payload.username };
    }
}
