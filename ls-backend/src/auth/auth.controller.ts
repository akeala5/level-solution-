import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Ip,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response, CookieOptions } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import {
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  Enable2FADto,
} from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── COOKIES httpOnly (auth) ───────────────────────────────────────────────
  // Même origine que le front (shop.lsgrouptogo.com) → cookie first-party,
  // SameSite=Lax, host-only (pas de Domain élargi = aucune fuite inter-sous-domaines).
  private readonly isProd = process.env.NODE_ENV === 'production';

  private cookieBase(): CookieOptions {
    return { httpOnly: true, secure: this.isProd, sameSite: 'lax', path: '/' };
  }

  private setAuthCookies(res: Response, tokens?: { accessToken?: string; refreshToken?: string }) {
    if (tokens?.accessToken) {
      res.cookie('accessToken', tokens.accessToken, { ...this.cookieBase(), maxAge: 24 * 60 * 60 * 1000 }); // 1 j
    }
    if (tokens?.refreshToken) {
      res.cookie('refreshToken', tokens.refreshToken, { ...this.cookieBase(), maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 j
    }
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('accessToken', this.cookieBase());
    res.clearCookie('refreshToken', this.cookieBase());
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: "Créer un compte" })
  @ApiResponse({ status: 201, description: 'Compte créé avec succès' })
  @ApiResponse({ status: 409, description: 'Email ou téléphone déjà utilisé' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setAuthCookies(res, result?.data as any);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Body() dto: LoginDto, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto, ip);
    // Cas 2FA-pending : result.data ne contient pas de tokens → setAuthCookies no-op.
    this.setAuthCookies(res, result?.data as any);
    return result;
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rafraîchir le token JWT' })
  async refresh(@CurrentUser() user: any, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.refreshTokens(user.id, user.email, user.role);
    this.setAuthCookies(res, tokens);
    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Déconnexion' })
  async logout(@CurrentUser('id') userId: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logout(userId);
    this.clearAuthCookies(res);
    return result;
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vérifier le email avec le token reçu' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renvoyer email de vérification' })
  async resendVerification(@CurrentUser() user: any) {
    await this.authService.sendEmailVerification(user.id, user.email, user.firstName);
    return { message: 'Email de vérification envoyé' };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demander un lien de réinitialisation' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réinitialiser le mot de passe' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('2fa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Générer le secret 2FA et QR Code' })
  setup2FA(@CurrentUser('id') userId: string) {
    return this.authService.generate2FASecret(userId);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activer 2FA après scan du QR code' })
  enable2FA(@CurrentUser('id') userId: string, @Body() dto: Enable2FADto) {
    return this.authService.enable2FA(userId, dto);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Désactiver 2FA' })
  disable2FA(@CurrentUser('id') userId: string, @Body() dto: Enable2FADto) {
    return this.authService.disable2FA(userId, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir l\'utilisateur connecté' })
  me(@CurrentUser() user: any) {
    return { message: 'Profil récupéré', data: user };
  }
}
