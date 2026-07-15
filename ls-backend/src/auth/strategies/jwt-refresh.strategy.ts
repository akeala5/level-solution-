import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// Cookie httpOnly prioritaire, champ de body conservé en secours (rétrocompat).
const refreshCookieExtractor = (req: Request): string | null => req?.cookies?.refreshToken ?? null;

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        refreshCookieExtractor,
        ExtractJwt.fromBodyField('refreshToken'),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.cookies?.refreshToken ?? req.body?.refreshToken;
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, refreshToken: true, isSuspended: true },
    });

    if (!user || !user.refreshToken) throw new UnauthorizedException('Token de rafraîchissement invalide');
    if (user.isSuspended) throw new UnauthorizedException('Compte suspendu');

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) throw new UnauthorizedException('Token de rafraîchissement invalide');

    return user;
  }
}
