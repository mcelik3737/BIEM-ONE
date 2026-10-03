import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { AppRole } from '../../common/enums/app-role.enum';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

interface JwtPayload {
  sub: string;
  email: string;
  companyId: string;
  roles: AppRole[];
}

interface UserWithRoles {
  id: string;
  email: string;
  fullName: string;
  companyId: string;
  company: {
    id: string;
    name: string;
    slug: string;
  };
  roles: Array<{ role: { code: string } }>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        company: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    const tokens = await this.createTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.serializeUser(user),
      tokens,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    await this.rotateRefreshToken(payload.sub, dto.refreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        company: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Kullanıcı bulunamadı veya pasif.');
    }

    const tokens = await this.createTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.serializeUser(user),
      tokens,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Kullanıcı bulunamadı veya pasif.');
    }

    return this.serializeUser(user);
  }

  private async createTokens(user: UserWithRoles) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      roles: user.roles.map((item) => item.role.code as AppRole),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.accessSecret,
        expiresIn: this.accessTokenExpiresInSeconds,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshTokenExpiresInSeconds,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: await hash(refreshToken, 10),
        expiresAt: new Date(Date.now() + this.refreshTokenDays * 24 * 60 * 60 * 1000),
      },
    });
  }

  private async rotateRefreshToken(userId: string, refreshToken: string) {
    const activeTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const matchedToken = await this.findMatchingRefreshToken(activeTokens, refreshToken);

    if (!matchedToken) {
      throw new UnauthorizedException('Oturum yenilenemedi.');
    }

    await this.prisma.refreshToken.update({
      where: { id: matchedToken.id },
      data: { revokedAt: new Date() },
    });
  }

  private async findMatchingRefreshToken(
    activeTokens: Array<{ id: string; tokenHash: string }>,
    refreshToken: string,
  ) {
    for (const token of activeTokens) {
      if (await compare(refreshToken, token.tokenHash)) {
        return token;
      }
    }

    return null;
  }

  private async verifyRefreshToken(refreshToken: string) {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Oturum süresi doldu. Yeniden giriş yapın.');
    }
  }

  private serializeUser(user: UserWithRoles) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      companyId: user.companyId,
      company: {
        id: user.company.id,
        name: user.company.name,
        slug: user.company.slug,
      },
      roles: user.roles.map((item) => item.role.code as AppRole),
    };
  }

  private get accessSecret() {
    return this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  private get refreshSecret() {
    return this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  private get refreshTokenDays() {
    return Number(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_DAYS') ?? '7');
  }

  private get accessTokenExpiresInSeconds(): number {
    return this.parseDurationToSeconds(
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    );
  }

  private get refreshTokenExpiresInSeconds(): number {
    return this.refreshTokenDays * 24 * 60 * 60;
  }

  private parseDurationToSeconds(value: string): number {
    const normalized = value.trim().toLowerCase();
    const match = normalized.match(/^(\d+)([smhd]?)$/);

    if (!match) {
      return 15 * 60;
    }

    const amount = Number(match[1]);
    const unit = match[2] || 's';

    switch (unit) {
      case 'm':
        return amount * 60;
      case 'h':
        return amount * 60 * 60;
      case 'd':
        return amount * 24 * 60 * 60;
      default:
        return amount;
    }
  }
}
