import { Injectable, signal } from '@angular/core';

export type DialogTone = 'info' | 'danger' | 'error' | 'success';

export interface DialogState {
  kind: 'alert' | 'confirm';
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  tone: DialogTone;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly state = signal<DialogState | null>(null);
  private resolver: ((value: boolean) => void) | null = null;

  confirm(opts: { title?: string; message: string; confirmText?: string; cancelText?: string; tone?: DialogTone }): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
      this.state.set({
        kind: 'confirm',
        title: opts.title ?? 'Confirmar ação',
        message: opts.message,
        confirmText: opts.confirmText ?? 'Confirmar',
        cancelText: opts.cancelText ?? 'Cancelar',
        tone: opts.tone ?? 'danger',
      });
    });
  }

  alert(opts: { title?: string; message: string; confirmText?: string; tone?: DialogTone }): Promise<void> {
    return new Promise<void>((resolve) => {
      this.resolver = () => resolve();
      this.state.set({
        kind: 'alert',
        title: opts.title ?? 'Aviso',
        message: opts.message,
        confirmText: opts.confirmText ?? 'Entendi',
        cancelText: '',
        tone: opts.tone ?? 'info',
      });
    });
  }

  resolve(value: boolean): void {
    const r = this.resolver;
    this.state.set(null);
    this.resolver = null;
    if (r) r(value);
  }
}
