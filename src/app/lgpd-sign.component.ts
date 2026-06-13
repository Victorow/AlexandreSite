import {
  Component, inject, OnInit, signal, ViewChild, ElementRef, AfterViewInit, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService } from './supabase.service';
import { DataService } from './data';
import {
  LGPD_TERM_TEXT, LGPD_TERM_VERSION,
  extractBase64FromDataUrl, isDataUrlSignatureEmpty,
  getLgpdStatusLabel, getLgpdStatusColor, formatLgpdDate,
} from './lgpd-utils';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-lgpd-sign',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="space-y-6 max-w-3xl mx-auto animate-fade-in">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <mat-icon class="text-blue-500">gavel</mat-icon>
            Consentimento LGPD
          </h1>
          <p class="text-xs text-slate-400 mt-1">
            Aluno: <strong class="text-blue-400">{{ studentName() }}</strong> •
            Versão do Termo: {{ termVersion }}
          </p>
        </div>
        <a [routerLink]="['/alunos', studentId()]"
           class="px-3 py-2 bg-[#1C1C21] border border-white/5 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-1.5 hover:bg-[#25252B] transition-colors">
          <mat-icon class="!text-sm">arrow_back</mat-icon>
          Voltar
        </a>
      </div>

      <!-- Já assinado -->
      @if (alreadySigned()) {
        <div class="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
          <div class="flex items-center gap-3">
            <mat-icon class="text-emerald-400 !text-2xl">verified</mat-icon>
            <div>
              <p class="text-sm font-bold text-emerald-400">Termo já assinado</p>
              <p class="text-xs text-slate-400">Assinado em: {{ signedAt() }}</p>
            </div>
          </div>
          @if (signatureUrl()) {
            <div>
              <p class="text-xs text-slate-500 mb-2 uppercase font-bold tracking-wider">Assinatura registrada:</p>
              <img [src]="signatureUrl()" alt="Assinatura LGPD"
                   class="max-h-24 bg-white/5 border border-white/10 rounded-xl p-2 object-contain" />
            </div>
          }
          <a [routerLink]="['/alunos', studentId()]"
             class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all">
            <mat-icon class="!text-sm">arrow_back</mat-icon>
            Voltar ao Perfil
          </a>
        </div>
      }

      <!-- Formulário de assinatura -->
      @if (!alreadySigned()) {
        <!-- Termo LGPD -->
        <div class="bg-[#141417] border border-white/5 rounded-2xl p-6">
          <h2 class="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <mat-icon class="text-slate-400 !text-base">article</mat-icon>
            Leia o Termo antes de assinar
          </h2>
          <div class="h-56 overflow-y-auto pr-2 text-xs text-slate-400 leading-relaxed
                      scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent
                      border border-white/5 rounded-xl p-4 bg-[#0A0A0B] font-mono whitespace-pre-wrap">{{ termText }}</div>
        </div>

        <!-- Canvas de assinatura -->
        <div class="bg-[#141417] border border-white/5 rounded-2xl p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-white flex items-center gap-2">
              <mat-icon class="text-blue-500 !text-base">draw</mat-icon>
              Assine com o mouse ou toque na tela
            </h2>
            <button (click)="clearSignature()"
                    class="px-3 py-1.5 bg-[#1C1C21] border border-white/5 rounded-lg text-xs text-slate-400 hover:text-white hover:border-white/20 transition-all flex items-center gap-1">
              <mat-icon class="!text-xs">restart_alt</mat-icon>
              Limpar
            </button>
          </div>

          <div class="relative rounded-xl overflow-hidden border-2 transition-all"
               [class]="isDrawing() ? 'border-blue-500/60' : 'border-white/10'">
            <canvas #signatureCanvas
                    width="700" height="200"
                    class="w-full bg-white cursor-crosshair touch-none block"
                    style="height: 200px;"
                    (mousedown)="startDraw($event)"
                    (mousemove)="draw($event)"
                    (mouseup)="stopDraw()"
                    (mouseleave)="stopDraw()"
                    (touchstart)="startDrawTouch($event)"
                    (touchmove)="drawTouch($event)"
                    (touchend)="stopDraw()">
            </canvas>
            @if (!hasSigned()) {
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p class="text-slate-300/50 text-sm font-light select-none">Assine aqui</p>
              </div>
            }
          </div>

          <p class="text-[10px] text-slate-500">
            Ao clicar em "Confirmar Assinatura", o titular declara ter lido e concordado com o
            Termo de Consentimento acima — Lei nº 13.709/2018 (LGPD).
          </p>

          @if (errorMessage()) {
            <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
              {{ errorMessage() }}
            </div>
          }

          <button (click)="confirmSignature()"
                  [disabled]="!hasSigned() || isSubmitting()"
                  class="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 disabled:cursor-not-allowed
                         text-sm font-bold text-white rounded-xl transition-all shadow-lg shadow-blue-600/10
                         flex items-center justify-center gap-2">
            @if (isSubmitting()) {
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Registrando assinatura...
            } @else {
              <mat-icon class="!text-sm">verified</mat-icon>
              Confirmar Assinatura LGPD
            }
          </button>
        </div>
      }
    </div>
  `,
})
export class LgpdSignComponent implements OnInit, AfterViewInit {
  @ViewChild('signatureCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private supa = inject(SupabaseService);
  private zone = inject(NgZone);

  termText = LGPD_TERM_TEXT;
  termVersion = LGPD_TERM_VERSION;

  studentId = signal('');
  studentName = signal('');
  alreadySigned = signal(false);
  signedAt = signal('');
  signatureUrl = signal('');
  hasSigned = signal(false);
  isDrawing = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');

  private ctx: CanvasRenderingContext2D | null = null;

  ngOnInit() {
    this.route.params.subscribe(p => {
      const id = p['id'];
      if (id) {
        this.studentId.set(id);
        this.checkExistingSignature(id);
        this.loadStudentName(id);
      }
    });
  }

  ngAfterViewInit() {
    this.initCanvas();
  }

  private initCanvas() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;
    this.ctx.strokeStyle = '#1e3a5f';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  private async loadStudentName(id: string) {
    const { data: { session } } = await this.supa.client.auth.getSession();
    if (!session) return;
    const { data } = await this.supa.client
      .from('alunos').select('name').eq('id', id).single();
    if (data) this.studentName.set(data.name);
  }

  private async checkExistingSignature(alunoId: string) {
    try {
      const { data: { session } } = await this.supa.client.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `${environment.functionsUrl}/lgpd-sign/${alunoId}`,
        { headers: { 'Authorization': `Bearer ${session.access_token}`, 'apikey': environment.supabaseAnonKey } }
      );
      const json = await res.json();
      if (json.signed) {
        this.alreadySigned.set(true);
        this.signedAt.set(formatLgpdDate(new Date(json.signed_at)));
        this.signatureUrl.set(json.signature_url ?? '');
      }
    } catch { /* não bloqueia */ }
  }

  // ---- Canvas drawing ----

  private getPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const scaleX = this.canvasRef.nativeElement.width / rect.width;
    const scaleY = this.canvasRef.nativeElement.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  private getTouchPos(e: TouchEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const scaleX = this.canvasRef.nativeElement.width / rect.width;
    const scaleY = this.canvasRef.nativeElement.height / rect.height;
    const t = e.touches[0];
    return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
  }

  startDraw(e: MouseEvent) {
    if (!this.ctx) return;
    const { x, y } = this.getPos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.isDrawing.set(true);
  }

  draw(e: MouseEvent) {
    if (!this.isDrawing() || !this.ctx) return;
    const { x, y } = this.getPos(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.hasSigned.set(true);
  }

  startDrawTouch(e: TouchEvent) {
    e.preventDefault();
    if (!this.ctx) return;
    const { x, y } = this.getTouchPos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.isDrawing.set(true);
  }

  drawTouch(e: TouchEvent) {
    e.preventDefault();
    if (!this.isDrawing() || !this.ctx) return;
    const { x, y } = this.getTouchPos(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.hasSigned.set(true);
  }

  stopDraw() {
    this.isDrawing.set(false);
    if (this.ctx) this.ctx.beginPath();
  }

  clearSignature() {
    if (!this.ctx || !this.canvasRef) return;
    const c = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, c.width, c.height);
    this.hasSigned.set(false);
    this.errorMessage.set('');
  }

  async confirmSignature() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    if (isDataUrlSignatureEmpty(dataUrl)) {
      this.errorMessage.set('A assinatura está em branco. Por favor, assine no campo acima.');
      return;
    }

    const base64 = extractBase64FromDataUrl(dataUrl);
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      const { data: { session } } = await this.supa.client.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const res = await fetch(`${environment.functionsUrl}/lgpd-sign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': environment.supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ aluno_id: this.studentId(), signature_base64: base64 }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erro ao salvar assinatura');

      this.zone.run(() => {
        this.router.navigate(['/alunos', this.studentId()]);
      });
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Erro inesperado');
      this.isSubmitting.set(false);
    }
  }
}
