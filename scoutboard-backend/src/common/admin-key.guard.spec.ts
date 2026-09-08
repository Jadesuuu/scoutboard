import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminKeyGuard } from './admin-key.guard';

const ctxWithHeader = (value?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers: value === undefined ? {} : { 'x-admin-key': value },
      }),
    }),
  }) as unknown as ExecutionContext;

describe('AdminKeyGuard', () => {
  const original = process.env.ADMIN_API_KEY;
  let guard: AdminKeyGuard;

  beforeEach(() => {
    guard = new AdminKeyGuard();
  });

  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_API_KEY;
    else process.env.ADMIN_API_KEY = original;
  });

  it('allows every request when no admin key is configured', () => {
    delete process.env.ADMIN_API_KEY;
    expect(guard.canActivate(ctxWithHeader())).toBe(true);
    expect(guard.canActivate(ctxWithHeader('anything'))).toBe(true);
  });

  it('allows a request carrying the matching key', () => {
    process.env.ADMIN_API_KEY = 'secret';
    expect(guard.canActivate(ctxWithHeader('secret'))).toBe(true);
  });

  it('rejects a missing or wrong key with 403', () => {
    process.env.ADMIN_API_KEY = 'secret';
    expect(() => guard.canActivate(ctxWithHeader())).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(ctxWithHeader('nope'))).toThrow(
      ForbiddenException,
    );
  });
});
