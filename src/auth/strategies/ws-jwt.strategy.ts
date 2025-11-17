// import { Injectable } from "@nestjs/common";
// import { PassportStrategy } from "@nestjs/passport";
// import { Strategy } from "passport-jwt";

// NO-NEED, WS do not pass http request,so PassportStrateg works with HTTP

// @Injectable()
// export class WsJwtStrategy extends PassportStrategy(Strategy, 'ws-jwt') {
//     constructor() {
//         super({
//             jwtFromRequest: (req) => {
//                 //socket.io stores token in handshake.auth.token
//                 return req.handshake.auth?.token;
//             },
//             ignoreExpiration: false,
//             secretOrKey: process.env.JWT_ACCESS_SECRET!,
//         });
//     }

//     // decoded JWT playlod returns here
//     async validate(playlod: any) {
//         // return playlod;
//         return { sub: playlod.sub }
//     }
// }