import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import {
    JwtPayload,
    RequestWithRefreshToken,
} from '../interfaces/auth.interfaces';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: RequestWithRefreshToken) => {
                    const token = req?.cookies?.refresh_token;
                    return token ?? null;
                },
            ]),
            secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') || '',
            passReqToCallback: true,
        } as StrategyOptionsWithRequest);
    }

    validate(req: RequestWithRefreshToken, payload: JwtPayload) {
        const refreshToken = req.cookies?.refresh_token;
        if (!refreshToken)
            throw new UnauthorizedException('Missing refresh token');
        return { ...payload, refreshToken };
    }
}
