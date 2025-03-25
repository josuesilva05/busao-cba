import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

export class CustomRouteReuseStrategy implements RouteReuseStrategy {
  // Nunca armazena a rota, forçando sempre a recriação do componente.
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return false;
  }
  
  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void { }
  
  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return false;
  }
  
  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return null;
  }
  
  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    // Se os parâmetros mudarem, força a recriação
    return future.routeConfig === curr.routeConfig &&
           JSON.stringify(future.params) === JSON.stringify(curr.params);
  }
}
