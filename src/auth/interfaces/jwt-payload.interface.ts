export interface BaseJwtPayload {
    sub: string;
    username: string;
    email: string;
}

export type JwtPayloadInput = BaseJwtPayload;

export interface JwtPayloadOutput extends BaseJwtPayload {
    iat: number;
    exp: number;
}
