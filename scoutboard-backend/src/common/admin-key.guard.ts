import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Gates destructive routes on a public deployment.
 *
 * When ADMIN_API_KEY is unset (local dev) every request passes, preserving the
 * original behaviour. When it is set, the request must carry a matching
 * `x-admin-key` header. Read from process.env at request time so the guard has
 * no DI dependencies and behaves the same in unit tests and at runtime.
 */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.ADMIN_API_KEY;
    if (!expected) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers['x-admin-key'];
    const provided = Array.isArray(header) ? header[0] : header;

    if (provided !== expected) {
      throw new ForbiddenException('Admin key required');
    }
    return true;
  }
}
