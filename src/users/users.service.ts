import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LoginDto } from 'src/auth/dto/login.dto';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { DatabaseService } from 'src/database/database.service';

import bcrypt from "bcrypt";

@Injectable()
export class UsersService {

    constructor(private readonly databaseService: DatabaseService) { }


    async userExistsByMail(email: string): Promise<boolean> {
        const user = await this.databaseService.user.findUnique({
            where: {
                email,
            }
        })
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
                }
            });
        } catch (error) {
            if (error.code === 'P2002') {
                // prisma unique constriant
                throw new BadRequestException("Email already exists")
            }
            throw new BadRequestException("Failed to create user")
        }
    }

    //for login
    async validateUser(loginDto: LoginDto) {
        const user = await this.databaseService.user.findUnique({ where: { email: loginDto.email } });
        if (!user) throw new NotFoundException("User Not Found")

        const isPwdValid = await bcrypt.compare(loginDto.password, user.password);
        if (!isPwdValid) throw new BadRequestException("Invalid credentials");

        // remove Pwd before return
        const { password, ...cleanUser } = user;
        return { ...cleanUser };
    }



    // for refresh
    async findUserById(userId: string) {
        const user = this.databaseService.user.findUnique({ where: { id: userId } })
        if (!user) throw new NotFoundException("User not found");
        return user;
    }

    // for saving new refresh token
    async updateRefreshToken(userId: string, hashedRT: string) {
        await this.databaseService.user.update({
            where: { id: userId },
            data: {
                refreshToken: hashedRT,
            }
        })
    }

}
