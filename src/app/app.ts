import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';
import { getTrainerToken } from './components';
import { SupabaseService } from './supabase.service';
import { ToastComponent } from './toast.component';
import { DialogComponent } from './dialog.component';
import { DialogService } from './dialog.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, MatIconModule, ToastComponent, DialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  private router = inject(Router);
  private supa = inject(SupabaseService);
  private dialog = inject(DialogService);

  isLoginPage = signal(true);
  currentPath = signal('');
  trainerName = signal('Personal Trainer');
  trainerInitials = signal('PT');

  private authSub?: { data: { subscription: { unsubscribe: () => void } } };

  ngOnInit() {
    this.checkAuthentication(this.router.url);

    // Redireciona para o login assim que a sessão Supabase cair (logout,
    // expiração ou falha no refresh do token) — sem depender de navegação.
    // Sem isso, o token expirado deixava a tela "vazia" em vez de pedir login.
    this.authSub = this.supa.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
        if (!this.router.url.includes('/login')) {
          this.router.navigate(['/login']);
        }
      }
    });

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

  ngOnDestroy() {
    this.authSub?.data.subscription.unsubscribe();
  }

  async handleLogout() {
    const ok = await this.dialog.confirm({
      title: 'Sair do sistema',
      message: 'Deseja realmente sair do sistema de Personal Trainer?',
      confirmText: 'Sair',
      cancelText: 'Ficar',
    });
    if (ok) {
      await this.supa.signOut();
      this.router.navigate(['/login']);
    }
  }
}
