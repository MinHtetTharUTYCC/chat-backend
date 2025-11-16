import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from "bcrypt";
import { RegisterDto } from './dto/register.dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
    constructor(
        private jwt: JwtService,
        private readonly usersService: UsersService,
    ) {
        console.log("DEPENDEN:::", {
            dep1: JwtService,
            dep2: UsersService,
        })
    }

    async getTokens(userId: string) {
        const accessToken = await this.jwt.signAsync(
            {
                sub: userId
            },
            {
                secret: process.env.JWT_ACCESS_SECRET,
                expiresIn: '1h',
            }
        );

        const refreshToken = await this.jwt.signAsync(
            {
                sub: userId

            },
            {
                secret: process.env.JWT_REFRESH_SECRET,
                expiresIn: '7d',
            }
        );

        return { accessToken, refreshToken }
    }


    async login(loginDto: LoginDto) {
        //validate user
        const user = await this.usersService.validateUser(loginDto);

        // generate tokens
        const tokens = await this.getTokens(user.id);

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
        // check existing
        const userExists = await this.usersService.userExistsByMail(registerDto.email);
        if (userExists) {
            throw new BadRequestException("Email already taken")
        }

        // hash password
        const hashedPwd = await bcrypt.hash(registerDto.password, 10);

        //create user
        const newUser = await this.usersService.createNewUser({
            ...registerDto,
            password: hashedPwd,
        });

        //generate tokens
        const tokens = await this.getTokens(newUser.id);

        // save/update refreshToken to DB
        const hashedRT = await bcrypt.hash(tokens.refreshToken, 10);
        await this.usersService.updateRefreshToken(newUser.id, hashedRT);


        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: newUser
        }
    }

    async refreshTokens(userId: string, oldRefreshToken: string) {

        const user = await this.usersService.getRefreshTokenOfUser(userId);
        if (!user || !user.refreshToken) {
            throw new ForbiddenException('Access Denied');
        }

        const rtMatches = await bcrypt.compare(oldRefreshToken, user.refreshToken)
        if (!rtMatches) throw new ForbiddenException("Invalid refresh token");

        const newTokens = await this.getTokens(userId);

        const hashed = await bcrypt.hash(newTokens.refreshToken, 10);
        await this.usersService.updateRefreshToken(userId, hashed);

        return newTokens;
    }

    async logout(userId: string) {
        await this.usersService.deleteRefreshToken(userId);
    }
}


