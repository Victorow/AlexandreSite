import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;

  show(message: string, kind: ToastKind = 'info', durationMs = 4000): void {
    const id = ++this.seq;
    this.toasts.update((list) => [...list, { id, message, kind }]);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => this.dismiss(id), durationMs);
    }
  }

  success(message: string, durationMs?: number) { this.show(message, 'success', durationMs); }
  info(message: string, durationMs?: number) { this.show(message, 'info', durationMs); }
  warning(message: string, durationMs?: number) { this.show(message, 'warning', durationMs); }
  error(message: string, durationMs?: number) { this.show(message, 'error', durationMs); }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
