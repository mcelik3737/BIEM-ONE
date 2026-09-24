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
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
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
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
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
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
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
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.refreshSecret,
        expiresIn: `${this.refreshTokenDays}d`,
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
      throw new UnauthorizedException('Invalid refresh token');
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
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }

  private serializeUser(user: UserWithRoles) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      companyId: user.companyId,
      roles: user.roles.map((item) => item.role.code as AppRole),
    };
  }

  private get accessSecret() {
    return this.configService.get<string>('JWT_ACCESS_SECRET') ?? 'access-secret';
  }

  private get refreshSecret() {
    return this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'refresh-secret';
  }

  private get refreshTokenDays() {
    return Number(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_DAYS') ?? '7');
  }
}
