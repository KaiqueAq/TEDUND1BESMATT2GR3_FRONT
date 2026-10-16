import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Perfil } from './models';

/** Bloqueia rotas sem login e rotas que nao sao do perfil do usuario (data: { perfis: [...] }). */
export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.logado()) {
    return router.createUrlTree(['/login']);
  }
  const perfis = route.data['perfis'] as Perfil[] | undefined;
  if (perfis && !auth.tem(...perfis)) {
    return router.createUrlTree([auth.rotaInicial()]);
  }
  return true;
};
