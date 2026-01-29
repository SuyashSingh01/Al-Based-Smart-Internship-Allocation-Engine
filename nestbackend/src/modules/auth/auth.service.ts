// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginInput: LoginInput) {
    const user = await this.validateUser(loginInput.email, loginInput.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return {
      access_token: this.jwtService.sign({ 
        email: user.email, 
        sub: user.id,
        role: user.role 
      }),
      user,
    };
  }

  async register(registerInput: RegisterInput) {
    const hashedPassword = await bcrypt.hash(registerInput.password, 10);
    const user = await this.usersService.create({
      ...registerInput,
      password: hashedPassword,
      role: 'student', // Default role for new registrations
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return {
      access_token: this.jwtService.sign({ 
        email: user.email, 
        sub: user.id,
        role: user.role 
      }),
      user: result,
    };
  }

  async validateJwtPayload(payload: JwtPayload) {
    return this.usersService.findById(payload.sub);
  }
}