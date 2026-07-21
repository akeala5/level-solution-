import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Exige une adresse e-mail vérifiée pour les actions sensibles (créer une
 * annonce, passer commande / checkout, demander un retrait). À poser APRÈS le
 * JwtAuthGuard global (request.user est alors peuplé, avec isEmailVerified issu
 * de la jwt.strategy). Renvoie un 403 avec le code EMAIL_NOT_VERIFIED pour que
 * le frontend puisse afficher un message/bandeau dédié.
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Accès refusé');
    if (!user.isEmailVerified) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Veuillez vérifier votre adresse e-mail pour effectuer cette action.',
      });
    }
    return true;
  }
}
