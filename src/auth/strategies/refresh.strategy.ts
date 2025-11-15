import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt"


@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req) => req.cookies?.refresh_token
            ]),
            secretOrKey: process.env.JWT_REFRESH_SECRET,
            passReqToCallBack: true,
        })
    }

    validate(req: any, payload: any) {
        const refreshToken = req.cookies?.refresh_token;
        if (!refreshToken) throw new UnauthorizedException("Missing refresh token")
        return { ...payload, refreshToken };
    }
}