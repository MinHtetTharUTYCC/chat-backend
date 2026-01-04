import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { LoginDto } from 'src/auth/dto/login.dto';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { DatabaseService } from 'src/database/database.service';
import bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
    constructor(private readonly databaseService: DatabaseService) {}

    async userExistsByMail(email: string): Promise<boolean> {
        const user = await this.databaseService.user.findUnique({
            where: {
                email,
            },
        });
        return !!user;
    }

    async createNewUser(registerDto: RegisterDto) {
        try {
            return await this.databaseService.user.create({
                data: { ...registerDto },
                select: {
                    id: true,
                    username: true,
                    email: true,
                },
            });
        } catch (error) {
            if (error.code === 'P2002') {
                // prisma unique constriant
                throw new BadRequestException('Email already exists');
            }
            throw new BadRequestException('Failed to create user');
        }
    }

    //for login
    async validateUser(loginDto: LoginDto) {
        const user = await this.databaseService.user.findUnique({
            where: { email: loginDto.email },
            select: { id: true, username: true, email: true, password: true },
        });
        if (!user) throw new NotFoundException('User Not Found');

        const isPwdValid = await bcrypt.compare(
            loginDto.password,
            user.password,
        );
        if (!isPwdValid) throw new BadRequestException('Invalid credentials');

        // remove Pwd before return
        const { password, ...cleanUser } = user;
        return { ...cleanUser };
    }

    // for refresh
    async getRefreshTokenOfUser(userId: string) {
        const user = await this.databaseService.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, refreshToken: true },
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }
    // for saving new refresh token
    async updateRefreshToken(userId: string, hashedRT: string) {
        await this.databaseService.user.update({
            where: { id: userId },
            data: {
                refreshToken: hashedRT,
            },
        });
    }

    // For log out
    async deleteRefreshToken(userId: string) {
        await this.databaseService.user.update({
            where: { id: userId },
            data: {
                refreshToken: null,
            },
        });
    }

    // get user info
    async getMe(userId: string) {
        const user = this.databaseService.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
                username: true,
                email: true,
            },
        });

        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async updateUser(userId: string, dto: UpdateUserDto) {
        const user = await this.databaseService.user.update({
            where: { id: userId },
            data: {
                username: dto.username,
            },
            select: {
                id: true,
                username: true,
            },
        });

        return {
            success: true,
            username: user.username,
        };
    }

    async searchUsers(userId: string, query: string) {
        return this.databaseService.user.findMany({
            where: {
                id: {
                    not: userId,
                },
                username: { contains: query, mode: 'insensitive' },
            },
            select: {
                id: true,
                username: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
}
