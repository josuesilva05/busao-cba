import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MapStateService {
  private _activeMapRoute: string | null = null;

  setActiveMapRoute(route: string): void {
    this._activeMapRoute = route;
  }

  get activeMapRoute(): string | null {
    return this._activeMapRoute;
  }

  clearActiveMapRoute(): void {
    this._activeMapRoute = null;
  }
}
