import 'socket.io';

declare module 'socket.io' {
    interface Handshake {
        user?: {
            sub: string;
        };
    }
}
