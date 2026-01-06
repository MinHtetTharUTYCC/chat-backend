export interface JwtPayload {
    sub: string;
    username: string;
    email: string;
}

export interface RequestUser {
    sub: string;
    username: string;
}

export interface RequestWithRefreshToken extends Request {
    user: RequestUser & { refreshToken: string };
    cookies: {
        refresh_token?: string;
    };
}
