import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-[min(92vw,360px)]">
      @for (t of toast.toasts(); track t.id) {
        <div class="flex items-start gap-2.5 p-3 rounded-xl border shadow-lg animate-fade-in backdrop-blur"
             [ngClass]="{
               'bg-emerald-500/15 border-emerald-500/30 text-emerald-300': t.kind === 'success',
               'bg-blue-500/15 border-blue-500/30 text-blue-300': t.kind === 'info',
               'bg-amber-500/15 border-amber-500/30 text-amber-300': t.kind === 'warning',
               'bg-red-500/15 border-red-500/30 text-red-300': t.kind === 'error'
             }">
          <mat-icon class="!text-base shrink-0 mt-0.5">
            {{ t.kind === 'success' ? 'check_circle' : t.kind === 'warning' ? 'warning' : t.kind === 'error' ? 'error' : 'info' }}
          </mat-icon>
          <p class="text-xs font-semibold leading-snug flex-1">{{ t.message }}</p>
          <button (click)="toast.dismiss(t.id)" class="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
            <mat-icon class="!text-sm">close</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  toast = inject(ToastService);
}
