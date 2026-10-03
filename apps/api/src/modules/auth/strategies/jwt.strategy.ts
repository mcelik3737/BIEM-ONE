import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma.service';
import { AppRole } from '../../../common/enums/app-role.enum';

interface JwtPayload {
  sub: string;
  email: string;
  companyId: string;
  roles: AppRole[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { role: true } } },
    });
    if (!user?.isActive) throw new UnauthorizedException('Oturum geçersiz veya kullanıcı pasif.');
    return {
      id: payload.sub,
      email: user.email,
      companyId: user.companyId,
      roles: user.roles.map((item) => item.role.code as AppRole),
    };
  }
}
