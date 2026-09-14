import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';

/** Render free tier duerme el backend; al despertar puede fallar un par de veces antes de responder. */
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

function isColdStartError(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    (error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504)
  );
}

/** Reintenta solo lecturas (GET): son seguras de repetir sin duplicar acciones como el sorteo. */
export const coldStartRetryInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: MAX_RETRIES,
      delay: (error, retryCount) => {
        if (!isColdStartError(error) || retryCount > MAX_RETRIES) {
          return throwError(() => error);
        }
        return timer(RETRY_DELAY_MS);
      },
    }),
  );
};
