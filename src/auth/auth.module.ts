import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersService } from 'src/users/users.service';
import { DatabaseModule } from 'src/database/database.module';
import { DatabaseService } from 'src/database/database.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';

@Module({
  imports: [
    JwtModule.register({ //Can keep empty: manipuate in insides
      // secret: process.env.JWT_ACCESS_SECRET,
      // signOptions: { expiresIn: '15m' }, //short-lived access token
    }),
    PassportModule,
    DatabaseModule,

  ],
  providers: [AuthService, UsersService, DatabaseService, JwtStrategy, RefreshStrategy],//strategies must be listed
  controllers: [AuthController]
})
export class AuthModule { }
