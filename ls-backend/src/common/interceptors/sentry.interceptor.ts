import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // Ne pas envoyer les erreurs HTTP attendues (4xx) à Sentry
        if (!(error instanceof HttpException)) {
          Sentry.captureException(error, {
            extra: {
              handler: context.getHandler().name,
              class: context.getClass().name,
            },
          });
        }
        return throwError(() => error);
      }),
    );
  }
}
