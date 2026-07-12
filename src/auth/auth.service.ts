import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';

import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.usersService.findByEmail(dto.email);

    if (exists) {
      throw new BadRequestException(
        'Ya existe un usuario con ese email',
      );
    }

    const password = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password,
    });

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async login(email: string, password: string) {

  const user = await this.usersService.findByEmail(email);

  if (!user) {
    throw new UnauthorizedException(
      'Email o contraseña incorrectos',
    );
  }

  const validPassword = await bcrypt.compare(
    password,
    user.password,
  );

  if (!validPassword) {
    throw new UnauthorizedException(
      'Email o contraseña incorrectos',
    );
  }

  const token = this.jwtService.sign({
    sub: user.id,
    email: user.email,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}
}