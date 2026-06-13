import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';
import { getTrainerToken } from './components';
import { SupabaseService } from './supabase.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private router = inject(Router);
  private supa = inject(SupabaseService);

  isLoginPage = signal(true);
  currentPath = signal('');
  trainerName = signal('Personal Trainer');
  trainerInitials = signal('PT');

  ngOnInit() {
    this.checkAuthentication(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const url = (event as NavigationEnd).urlAfterRedirects || (event as NavigationEnd).url;
      this.currentPath.set(url);
      this.checkAuthentication(url);
    });

    // Load real PT name from Supabase Auth
    this.supa.client.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user) {
        const name = user.user_metadata?.['name'] ?? user.email?.split('@')[0] ?? 'Personal Trainer';
        this.trainerName.set(name);
        this.trainerInitials.set(
          name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        );
      }
    });
  }

  private checkAuthentication(url: string) {
    const isLogin = url.includes('/login');
    this.isLoginPage.set(isLogin);

    if (!isLogin && !getTrainerToken()) {
      this.router.navigate(['/login']);
    } else if (isLogin && getTrainerToken()) {
      this.router.navigate(['/']);
    }
  }

  async handleLogout() {
    if (confirm('Deseja realmente sair do sistema de Personal Trainer?')) {
      await this.supa.signOut();
      this.router.navigate(['/login']);
    }
  }
}
