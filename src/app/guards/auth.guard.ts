import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, map, take } from 'rxjs';
import { Auth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);
  private auth = inject(Auth);

  canActivate(): Observable<boolean> {
    // Aguarda o primeiro valor do authState do Firebase
    return new Observable<boolean>((subscriber) => {
      const unsubscribe = this.auth.onAuthStateChanged((user) => {
        if (user) {
          subscriber.next(true);
        } else {
          this.router.navigate(['/login'], { replaceUrl: true });
          subscriber.next(false);
        }
        subscriber.complete();
        unsubscribe();
      });
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(): Observable<boolean> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          return true;
        } else {
          this.router.navigate(['/'], { replaceUrl: true });
          return false;
        }
      })
    );
  }
}
