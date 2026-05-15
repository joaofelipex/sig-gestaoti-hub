import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.loading$.pipe(
      filter((loading) => !loading),
      take(1),
      map(() => this.authService.user),
      map((user) => {
        if (user) {
          return true;
        }
        this.router.navigate(['/auth']);
        return false;
      }),
    );
  }
}