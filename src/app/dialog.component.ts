import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DialogService } from './dialog.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (dialog.state(); as d) {
      <div class="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
           (click)="d.kind === 'alert' ? dialog.resolve(false) : null">
        <div class="w-full max-w-sm bg-[#141417] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
             (click)="$event.stopPropagation()">
          <div class="p-5 flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                 [ngClass]="{
                   'bg-blue-500/15 border border-blue-500/30': d.tone === 'info',
                   'bg-red-500/15 border border-red-500/30': d.tone === 'danger' || d.tone === 'error',
                   'bg-emerald-500/15 border border-emerald-500/30': d.tone === 'success'
                 }">
              <mat-icon [ngClass]="{
                'text-blue-400': d.tone === 'info',
                'text-red-400': d.tone === 'danger' || d.tone === 'error',
                'text-emerald-400': d.tone === 'success'
              }">
                {{ d.tone === 'success' ? 'check_circle' : d.tone === 'info' ? 'info' : d.kind === 'confirm' ? 'help' : 'error' }}
              </mat-icon>
            </div>
            <div class="flex-1 pt-0.5">
              <h2 class="text-sm font-extrabold text-white">{{ d.title }}</h2>
              <p class="text-xs text-slate-400 mt-1 leading-relaxed whitespace-pre-line">{{ d.message }}</p>
            </div>
          </div>
          <div class="px-5 py-4 bg-[#0F0F12] flex items-center justify-end gap-2">
            @if (d.kind === 'confirm') {
              <button (click)="dialog.resolve(false)"
                      class="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 transition-colors">
                {{ d.cancelText }}
              </button>
            }
            <button (click)="dialog.resolve(true)"
                    class="px-4 py-2 rounded-xl text-xs font-extrabold text-white transition-all shadow-md"
                    [ngClass]="{
                      'bg-blue-600 hover:bg-blue-500': d.tone === 'info' || d.tone === 'success',
                      'bg-red-600 hover:bg-red-500': d.tone === 'danger' || d.tone === 'error'
                    }">
              {{ d.confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class DialogComponent {
  dialog = inject(DialogService);
}
