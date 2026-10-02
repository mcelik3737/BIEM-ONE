import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
// Single API instance limiter. In a multi-replica deployment enforce a shared limit at the gateway.
@Injectable()
export class LoginRateGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; expires: number }>();
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ ip: string }>();
    const now = Date.now();
    for (const [key, value] of this.hits) if (value.expires < now) this.hits.delete(key);
    const key = request.ip;
    const hit = this.hits.get(key) ?? { count: 0, expires: now + 60000 };
    hit.count++;
    this.hits.set(key, hit);
    if (hit.count > 30 || this.hits.size > 10000)
      throw new HttpException('Çok fazla giriş denemesi. Bir dakika sonra tekrar deneyin.', 429);
    return true;
  }
}
