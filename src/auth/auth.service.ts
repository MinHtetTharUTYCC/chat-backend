import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from 'src/users/users.service';

export type JwtPayload = {
    sub: string;
    username: string;
};

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    constructor(
        private jwt: JwtService,
        private readonly usersService: UsersService,
    ) {}

    async getTokens(userId: string, username: string) {
        const payload: JwtPayload = {
            sub: userId,
            username,
        };

        const accessSecret = process.env.JWT_ACCESS_SECRET;
        const refreshSecret = process.env.JWT_REFRESH_SECRET;

        if (!accessSecret || !refreshSecret) {
            throw new Error('JWT secrets not configured');
        }

        const accessToken = await this.jwt.signAsync(payload, {
            secret: accessSecret,
            expiresIn: '3h',
        });
        const refreshToken = await this.jwt.signAsync(payload, {
            secret: refreshSecret,
            expiresIn: '7d',
        });

        return { accessToken, refreshToken };
    }

    async login(loginDto: LoginDto) {
        this.logger.log(`User Logged in: ${loginDto.email}`);
        //validate user
        const user = await this.usersService.validateUser(loginDto);

        // generate tokens
        const tokens = await this.getTokens(user.id, user.username);

        // save/update refreshToken to DB
        const hashedRT = await bcrypt.hash(tokens.refreshToken, 10);
        await this.usersService.updateRefreshToken(user.id, hashedRT);

        //return accessToken + userData
        return {
            ...tokens,
            user,
        };
    }

    async register(registerDto: RegisterDto) {
        this.logger.log(`User registered: ${registerDto.email}`);
        // check existing
        const userExists = await this.usersService.userExistsByMail(
            registerDto.email,
        );
        if (userExists) {
            throw new BadRequestException('Email already taken');
        }

        // hash password
        const hashedPwd = await bcrypt.hash(registerDto.password, 10);

        //create user
        const newUser = await this.usersService.createNewUser({
            ...registerDto,
            password: hashedPwd,
        });

        //generate tokens
        const tokens = await this.getTokens(newUser.id, registerDto.username);

        // save/update refreshToken to DB
        const hashedRT = await bcrypt.hash(tokens.refreshToken, 10);
        await this.usersService.updateRefreshToken(newUser.id, hashedRT);

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: newUser,
        };
    }

    async refreshTokens(userId: string, oldRefreshToken: string) {
        this.logger.log(`User Refreshed tokens: ${userId}`);
        const user = await this.usersService.getRefreshTokenOfUser(userId);
        if (!user || !user.refreshToken) {
            throw new ForbiddenException('Access Denied');
        }

        const rtMatches = await bcrypt.compare(
            oldRefreshToken,
            user.refreshToken,
        );
        if (!rtMatches) throw new ForbiddenException('Invalid refresh token');

        const newTokens = await this.getTokens(userId, user.username);

        const hashed = await bcrypt.hash(newTokens.refreshToken, 10);
        await this.usersService.updateRefreshToken(userId, hashed);

        return newTokens;
    }

    async logout(userId: string) {
        this.logger.log(`User Logged out: ${userId}`);
        await this.usersService.deleteRefreshToken(userId);
    }
}
