import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

interface UserWithRoles {
  id: string;
  email: string;
  fullName: string;
  companyId: string;
  roles: Array<{ role: { code: string } }>;
}
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}
  private async user(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!user?.isActive) throw new UnauthorizedException('Oturum geçersiz.');
    return user;
  }
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      include: { roles: { include: { role: true } } },
    });
    if (!user?.isActive || !(await compare(dto.password, user.passwordHash)))
      throw new UnauthorizedException('E-posta veya parola hatalı.');
    const tokens = await this.tokens(user);
    await this.prisma.refreshToken.create({ data: this.refreshData(user.id, tokens.refreshToken) });
    return { user: this.serialize(user), tokens };
  }
  async refresh(dto: RefreshTokenDto) {
    let sub: string;
    try {
      ({ sub } = await this.jwt.verifyAsync<{ sub: string }>(dto.refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        algorithms: ['HS256'],
      }));
    } catch {
      throw new UnauthorizedException('Oturum süresi doldu.');
    }
    const user = await this.user(sub);
    const tokens = await this.tokens(user);
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.refreshToken.updateMany({
        where: {
          userId: sub,
          tokenHash: digest(dto.refreshToken),
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { revokedAt: new Date() },
      });
      if (result.count !== 1) throw new UnauthorizedException('Oturum süresi doldu.');
      await tx.refreshToken.create({ data: this.refreshData(sub, tokens.refreshToken) });
    });
    return { user: this.serialize(user), tokens };
  }
  async logout(dto: RefreshTokenDto) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: digest(dto.refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }
  async me(id: string) {
    return this.serialize(await this.user(id));
  }
  private serialize(u: UserWithRoles) {
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      companyId: u.companyId,
      roles: u.roles.map((r) => r.role.code),
    };
  }
  private async tokens(u: UserWithRoles) {
    const payload = { sub: u.id };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: 900,
        jwtid: randomUUID(),
        algorithm: 'HS256',
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: 604800,
        jwtid: randomUUID(),
        algorithm: 'HS256',
      }),
    ]);
    return { accessToken, refreshToken };
  }
  private refreshData(userId: string, token: string) {
    return { userId, tokenHash: digest(token), expiresAt: new Date(Date.now() + 604800000) };
  }
}
