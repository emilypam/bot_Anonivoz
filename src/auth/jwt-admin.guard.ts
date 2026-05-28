import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class JwtAdminGuard extends JwtAuthGuard {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) throw err ?? new ForbiddenException('No autorizado');
    if (!user.isAdmin) throw new ForbiddenException('Se requieren permisos de administrador');
    return user;
  }
}
