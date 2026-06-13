import { jsPDF } from 'jspdf';
import { Student, Assessment } from './data';
import { getLgpdStatusLabel } from './lgpd-utils';

// =====================================================================
// FUNÇÕES PURAS (testáveis sem DOM) — formatação e classificação
// =====================================================================

/** Formata número com N casas; retorna '—' para null/undefined/NaN. */
export function pdfFormatNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

/** Converte 'YYYY-MM-DD' → 'DD/MM/YYYY' sem bug de fuso horário. */
export function pdfFormatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(dateStr);
  return Number.isNaN(dt.getTime())
    ? '—'
    : dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** 'YYYY-MM-DD' → 'DD/MM' (rótulos de gráfico). */
export function pdfShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  return m ? `${m[3]}/${m[2]}` : '—';
}

/** Idade em anos a partir da data de nascimento. */
export function pdfAgeFromBirth(birthDate: string, ref: Date): number {
  const b = new Date(birthDate);
  let age = ref.getFullYear() - b.getFullYear();
  const monthDiff = ref.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < b.getDate())) age--;
  return age;
}

export function pdfGenderLabel(g: 'MALE' | 'FEMALE'): string {
  return g === 'MALE' ? 'Masculino' : 'Feminino';
}

export function pdfVisceralLabel(risk: 'NORMAL' | 'HIGH' | 'VERY_HIGH'): string {
  if (risk === 'NORMAL') return 'Normal';
  if (risk === 'HIGH') return 'Alto';
  return 'Muito Alto';
}

/** Sim/Não/— para booleanos possivelmente ausentes. */
export function pdfBoolLabel(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value ? 'Sim' : 'Não';
}

/** Texto não vazio ou '—'. */
export function pdfText(value: string | null | undefined): string {
  const t = (value ?? '').trim();
  return t.length ? t : '—';
}

/** Nome legível do protocolo de dobras. */
export function pdfProtocolLabel(protocol: string | null | undefined): string {
  if (!protocol) return '—';
  const map: Record<string, string> = {
    '7_dobras': '7 Dobras (Jackson & Pollock)',
    '3_dobras': '3 Dobras (Jackson & Pollock)',
  };
  return map[protocol] ?? protocol;
}

export type DeltaDir = 'up' | 'down' | 'flat';

export interface DeltaInfo {
  text: string;       // ex: "+1.2" / "-0.5" / "—"
  dir: DeltaDir;      // direção numérica
}

/** Calcula a variação atual − anterior. */
export function pdfDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
  digits = 1,
): DeltaInfo {
  if (
    current === null || current === undefined || Number.isNaN(current) ||
    previous === null || previous === undefined || Number.isNaN(previous)
  ) {
    return { text: '—', dir: 'flat' };
  }
  const diff = current - previous;
  const rounded = Number(diff.toFixed(digits));
  if (rounded === 0) return { text: '0', dir: 'flat' };
  const sign = rounded > 0 ? '+' : '';
  return { text: `${sign}${rounded.toFixed(digits)}`, dir: rounded > 0 ? 'up' : 'down' };
}

// =====================================================================
// GERAÇÃO DO PDF (usa jsPDF — vetorial, layout próprio)
// =====================================================================

export interface AssessmentPdfData {
  student: Student;
  assessment: Assessment;
  previous: Assessment | null;
  trainerName: string;
  generatedAt: Date;
}

// Paleta (documento claro, profissional)
const C = {
  primary: [37, 99, 235] as [number, number, number],
  primaryDark: [30, 58, 138] as [number, number, number],
  ink: [30, 41, 59] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  faint: [148, 163, 184] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  zebra: [248, 250, 252] as [number, number, number],
  cardBg: [241, 245, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],
  grayBar: [148, 163, 184] as [number, number, number],
};

const PAGE_W = 210;
const PAGE_H = 297;
const M = 14;
const CONTENT_W = PAGE_W - M * 2;
const FOOTER_Y = PAGE_H - 12;
const BOTTOM_LIMIT = PAGE_H - 18;

export function generateAssessmentPDF(data: AssessmentPdfData): jsPDF {
  const { student, assessment: a, previous: prev, trainerName, generatedAt } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = 0;

  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

  // Trunca texto por largura real (mm), com reticências.
  const truncate = (text: string, maxW: number): string => {
    if (doc.getTextWidth(text) <= maxW) return text;
    let t = text;
    while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1);
    return t + '…';
  };

  const runningHeader = () => {
    setText(C.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('FocusPT', M, M);
    setText(C.faint);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(truncate(student.name, 90), PAGE_W - M, M, { align: 'right' });
    setDraw(C.line);
    doc.setLineWidth(0.3);
    doc.line(M, M + 2, PAGE_W - M, M + 2);
    y = M + 8;
  };

  const ensure = (needed: number) => {
    if (y + needed > BOTTOM_LIMIT) {
      doc.addPage();
      y = M + 4;
      runningHeader();
    }
  };

  const mainHeader = () => {
    setFill(C.primaryDark);
    doc.rect(0, 0, PAGE_W, 32, 'F');
    setFill(C.primary);
    doc.rect(0, 30, PAGE_W, 2, 'F');

    setText(C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('FocusPT', M, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setText([191, 219, 254]);
    doc.text('Gestão de Avaliação Física', M, 21);

    setText(C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('RELATÓRIO DE AVALIAÇÃO FÍSICA', PAGE_W - M, 14, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setText([191, 219, 254]);
    doc.text(`Emitido em ${pdfFormatDate(generatedAt.toISOString())}`, PAGE_W - M, 20, { align: 'right' });

    y = 42;
  };

  const sectionTitle = (label: string) => {
    ensure(14);
    setFill(C.primary);
    doc.rect(M, y, 3, 6, 'F');
    setText(C.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(label.toUpperCase(), M + 6, y + 5);
    setDraw(C.line);
    doc.setLineWidth(0.3);
    doc.line(M, y + 8.5, PAGE_W - M, y + 8.5);
    y += 14;
  };

  // ======================= PÁGINA 1 — CABEÇALHO =======================
  mainHeader();

  // ---- bloco de dados do aluno (3 linhas, sem sobreposição) ----
  const age = pdfAgeFromBirth(student.birth_date, generatedAt);
  const blockH = 38;
  setFill(C.cardBg);
  doc.roundedRect(M, y, CONTENT_W, blockH, 2, 2, 'F');

  const colW = CONTENT_W / 4;
  const infoCell = (col: number, row: number, label: string, value: string) => {
    const cx = M + 5 + col * colW;
    const cy = y + 8 + row * 11;
    const maxW = colW - 8; // não invade a coluna seguinte
    setText(C.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(label.toUpperCase(), cx, cy);
    setText(C.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(truncate(value, maxW), cx, cy + 5);
  };
  infoCell(0, 0, 'Aluno', pdfText(student.name));
  infoCell(1, 0, 'Idade', `${age} anos`);
  infoCell(2, 0, 'Sexo', pdfGenderLabel(student.gender));
  infoCell(3, 0, 'Altura', `${pdfFormatNumber(student.height_cm, 0)} cm`);
  infoCell(0, 1, 'Nascimento', pdfFormatDate(student.birth_date));
  infoCell(1, 1, 'Data da Avaliação', pdfFormatDate(a.date));
  infoCell(2, 1, 'Avaliação Anterior', prev ? pdfFormatDate(prev.date) : '—');
  infoCell(3, 1, 'Telefone', pdfText(student.phone_number));
  infoCell(0, 2, 'Objetivo', pdfText(student.goal));
  infoCell(2, 2, 'Status LGPD', getLgpdStatusLabel(student.lgpd_consent_status));
  y += blockH + 6;

  // ---- cards de indicadores principais ----
  sectionTitle('Indicadores Principais');

  const cardGap = 4;
  const cardW = (CONTENT_W - cardGap * 2) / 3;
  const cardH = 24;

  interface MetricCard {
    label: string; value: string; unit: string;
    sub?: string; delta?: DeltaInfo; improve?: 'down' | 'up' | 'neutral';
  }

  const drawCard = (idx: number, m: MetricCard) => {
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    const cx = M + col * (cardW + cardGap);
    const cy = y + row * (cardH + cardGap);

    setFill(C.white);
    setDraw(C.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'FD');
    setFill(C.primary);
    doc.rect(cx, cy, 1.5, cardH, 'F');

    setText(C.muted);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(m.label.toUpperCase(), cx + 5, cy + 6);

    setText(C.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(m.value, cx + 5, cy + 14);
    if (m.unit) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setText(C.faint);
      const vw = doc.getTextWidth(m.value);
      doc.text(m.unit, cx + 5 + vw + 1.5, cy + 14);
    }

    let subX = cx + 5;
    if (m.sub) {
      setText(C.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const subTxt = truncate(m.sub, cardW - 10);
      doc.text(subTxt, subX, cy + 20);
      subX += doc.getTextWidth(subTxt) + 3;
    }
    if (m.delta && m.delta.text !== '—' && m.delta.dir !== 'flat') {
      let dc = C.muted;
      if (m.improve && m.improve !== 'neutral') {
        const good = (m.improve === 'down' && m.delta.dir === 'down') ||
                     (m.improve === 'up' && m.delta.dir === 'up');
        dc = good ? C.green : C.red;
      }
      setText(dc);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(`${m.delta.text}`, subX, cy + 20);
    }
  };

  const bio = a.bioimpedancias;
  const pbio = prev?.bioimpedancias;
  const cards: MetricCard[] = [
    { label: 'Peso', value: pdfFormatNumber(bio?.weight_kg), unit: 'kg', delta: pdfDelta(bio?.weight_kg, pbio?.weight_kg), improve: 'neutral' },
    { label: 'IMC', value: pdfFormatNumber(a.bmi), unit: '', sub: pdfText(a.bmi_classification), delta: pdfDelta(a.bmi, prev?.bmi), improve: 'neutral' },
    { label: '% Gordura', value: pdfFormatNumber(a.body_fat_percentage), unit: '%', sub: pdfText(a.body_fat_classification), delta: pdfDelta(a.body_fat_percentage, prev?.body_fat_percentage), improve: 'down' },
    { label: 'Massa Magra', value: pdfFormatNumber(a.lean_mass_kg), unit: 'kg', delta: pdfDelta(a.lean_mass_kg, prev?.lean_mass_kg), improve: 'up' },
    { label: 'Idade Corporal', value: pdfFormatNumber(bio?.body_age, 0), unit: 'anos', delta: pdfDelta(bio?.body_age, pbio?.body_age, 0), improve: 'down' },
    { label: 'Gordura Visceral', value: pdfFormatNumber(bio?.visceral_fat_level, 0), unit: '', sub: pdfVisceralLabel(a.visceral_risk), delta: pdfDelta(bio?.visceral_fat_level, pbio?.visceral_fat_level, 0), improve: 'down' },
  ];
  cards.forEach((m, i) => drawCard(i, m));
  y += cardH * 2 + cardGap + 8;

  // =================== GRÁFICOS ===================

  // -- gráfico de barras comparativo (Atual vs Anterior) --
  const drawBarChart = (
    x: number, gy: number, w: number, h: number,
    title: string,
    groups: { label: string; cur: number | null | undefined; prev: number | null | undefined }[],
  ) => {
    setFill(C.white); setDraw(C.line); doc.setLineWidth(0.3);
    doc.roundedRect(x, gy, w, h, 2, 2, 'FD');
    setText(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text(title, x + 4, gy + 6);

    // legenda
    const lx = x + w - 48;
    setFill(C.grayBar); doc.rect(lx, gy + 3, 3, 3, 'F');
    setText(C.muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
    doc.text('Anterior', lx + 4, gy + 5.5);
    setFill(C.primary); doc.rect(lx + 24, gy + 3, 3, 3, 'F');
    doc.text('Atual', lx + 28, gy + 5.5);

    const padL = 5, padR = 5, padT = 11, padB = 10;
    const px = x + padL, py = gy + padT, pw = w - padL - padR, ph = h - padT - padB;
    const n = groups.length;
    const groupW = pw / n;

    setDraw(C.line); doc.setLineWidth(0.3);
    doc.line(px, py + ph, px + pw, py + ph); // base

    groups.forEach((g, i) => {
      const gx = px + i * groupW;
      const cur = (g.cur ?? null);
      const prv = (g.prev ?? null);
      const localMax = Math.max(cur ?? 0, prv ?? 0, 0.0001);
      const barW = groupW * 0.26;
      const cluster = barW * 2 + 2;
      const startX = gx + (groupW - cluster) / 2;

      const drawBar = (bx: number, val: number | null, color: [number, number, number]) => {
        if (val === null || Number.isNaN(val)) {
          setText(C.faint); doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
          doc.text('—', bx + barW / 2, py + ph - 1, { align: 'center' });
          return;
        }
        const bh = Math.max((val / localMax) * (ph - 4), 0.5);
        setFill(color);
        doc.rect(bx, py + ph - bh, barW, bh, 'F');
        setText(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(6);
        doc.text(val.toFixed(1), bx + barW / 2, py + ph - bh - 1.2, { align: 'center' });
      };
      drawBar(startX, prv, C.grayBar);
      drawBar(startX + barW + 2, cur, C.primary);

      setText(C.muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
      doc.text(truncate(g.label, groupW - 1), gx + groupW / 2, py + ph + 5, { align: 'center' });
    });
  };

  // -- gráfico de linha (evolução histórica) --
  const drawLineChart = (
    x: number, gy: number, w: number, h: number,
    title: string, unit: string,
    points: { label: string; v: number }[],
    color: [number, number, number],
  ) => {
    setFill(C.white); setDraw(C.line); doc.setLineWidth(0.3);
    doc.roundedRect(x, gy, w, h, 2, 2, 'FD');
    setText(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text(title, x + 4, gy + 6);

    const padL = 12, padR = 5, padT = 10, padB = 9;
    const px = x + padL, py = gy + padT, pw = w - padL - padR, ph = h - padT - padB;

    if (points.length === 0) {
      setText(C.faint); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      doc.text('Sem dados disponíveis', x + w / 2, gy + h / 2, { align: 'center' });
      return;
    }

    const vals = points.map(p => p.v);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (min === max) { min -= 1; max += 1; }
    const range = max - min || 1;

    // gridlines + labels Y
    setDraw(C.line); doc.setLineWidth(0.2);
    setText(C.faint); doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
    for (let k = 0; k <= 2; k++) {
      const yy = py + (ph * k) / 2;
      const val = max - (range * k) / 2;
      doc.line(px, yy, px + pw, yy);
      doc.text(val.toFixed(1), px - 1.5, yy + 1.5, { align: 'right' });
    }

    const n = points.length;
    const xat = (i: number) => (n === 1 ? px + pw / 2 : px + (pw * i) / (n - 1));
    const yat = (v: number) => py + ph - ((v - min) / range) * ph;

    // linha
    setDraw(color); doc.setLineWidth(0.7);
    for (let i = 1; i < n; i++) {
      doc.line(xat(i - 1), yat(points[i - 1].v), xat(i), yat(points[i].v));
    }
    // pontos + rótulos
    points.forEach((p, i) => {
      setFill(color);
      doc.circle(xat(i), yat(p.v), 1, 'F');
      setText(C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(6);
      doc.text(p.v.toFixed(1), xat(i), yat(p.v) - 2, { align: 'center' });
      setText(C.muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8);
      doc.text(p.label, xat(i), py + ph + 5, { align: 'center' });
    });
    setText(C.faint); doc.setFontSize(6);
    doc.text(unit, px, gy + h - 1);
  };

  // monta dados dos gráficos
  const chartH = 50;
  const half = (CONTENT_W - 4) / 2;

  // barras comparativas
  sectionTitle('Comparativo — Atual vs. Avaliação Anterior');
  ensure(chartH + 2);
  drawBarChart(M, y, CONTENT_W, chartH, 'Composição Corporal', [
    { label: 'Peso (kg)', cur: bio?.weight_kg, prev: pbio?.weight_kg },
    { label: '% Gordura', cur: a.body_fat_percentage, prev: prev?.body_fat_percentage },
    { label: '% Músculo', cur: bio?.skeletal_muscle_percentage, prev: pbio?.skeletal_muscle_percentage },
    { label: 'M. Magra (kg)', cur: a.lean_mass_kg, prev: prev?.lean_mass_kg },
    { label: 'M. Gorda (kg)', cur: a.fat_mass_kg, prev: prev?.fat_mass_kg },
  ]);
  y += chartH + 8;

  // evolução histórica (todas as avaliações)
  const history = [...student.avaliacoes].sort((x1, x2) => x1.date.localeCompare(x2.date));
  const weightPts = history
    .map(h => ({ label: pdfShortDate(h.date), v: h.bioimpedancias?.weight_kg }))
    .filter(p => p.v !== null && p.v !== undefined && !Number.isNaN(p.v)) as { label: string; v: number }[];
  const fatPts = history
    .map(h => ({ label: pdfShortDate(h.date), v: h.body_fat_percentage }))
    .filter(p => p.v !== null && p.v !== undefined && !Number.isNaN(p.v)) as { label: string; v: number }[];

  sectionTitle('Evolução Histórica');
  ensure(chartH + 2);
  drawLineChart(M, y, half, chartH, 'Peso', 'kg', weightPts, C.primary);
  drawLineChart(M + half + 4, y, half, chartH, '% Gordura Corporal', '%', fatPts, C.red);
  y += chartH + 8;

  // =================== TABELAS ===================
  interface Row { label: string; cur: string; prevVal?: string; delta?: DeltaInfo; }

  const drawTable = (title: string, rows: Row[], showCompare: boolean) => {
    sectionTitle(title);

    const cLabel = M + 3;
    const cCur = showCompare ? M + CONTENT_W * 0.50 : M + CONTENT_W * 0.42;
    const cPrev = M + CONTENT_W * 0.69;
    const cDelta = M + CONTENT_W * 0.86;
    const baseH = 7;
    const lineH = 4.2;
    const valueMaxW = (PAGE_W - M) - cCur - 2;

    // cabeçalho
    setFill(C.primaryDark);
    doc.rect(M, y, CONTENT_W, baseH, 'F');
    setText(C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('PARÂMETRO', cLabel, y + 4.7);
    doc.text('ATUAL', cCur, y + 4.7);
    if (showCompare) {
      doc.text('ANTERIOR', cPrev, y + 4.7);
      doc.text('VARIAÇÃO', cDelta, y + 4.7);
    }
    y += baseH;

    rows.forEach((r, i) => {
      // quebra de linha do valor (campos de texto longos)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      const valueLines: string[] = showCompare
        ? [r.cur]
        : doc.splitTextToSize(r.cur, valueMaxW);
      const rowH = Math.max(baseH, valueLines.length * lineH + 2.8);

      ensure(rowH);

      if (i % 2 === 1) {
        setFill(C.zebra);
        doc.rect(M, y, CONTENT_W, rowH, 'F');
      }

      setText(C.ink);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(truncate(r.label, cCur - cLabel - 2), cLabel, y + 4.7);

      doc.setFont('helvetica', 'bold');
      setText(C.ink);
      valueLines.forEach((ln, li) => doc.text(ln, cCur, y + 4.7 + li * lineH));

      if (showCompare) {
        doc.setFont('helvetica', 'normal');
        setText(C.muted);
        doc.text(r.prevVal ?? '—', cPrev, y + 4.7);
        if (r.delta && r.delta.text !== '—' && r.delta.dir !== 'flat') {
          setText(r.delta.dir === 'up' ? C.amber : C.green);
          doc.setFont('helvetica', 'bold');
          doc.text(r.delta.text, cDelta, y + 4.7);
        } else {
          setText(C.faint);
          doc.text('—', cDelta, y + 4.7);
        }
      }
      y += rowH;
    });
    setDraw(C.line);
    doc.setLineWidth(0.3);
    doc.line(M, y, PAGE_W - M, y);
    y += 8;
  };

  // ---- Bioimpedância (Omron) ----
  drawTable('Composição Corporal — Bioimpedância (Omron HBF-514C)', [
    { label: 'Peso (kg)', cur: pdfFormatNumber(bio?.weight_kg), prevVal: pdfFormatNumber(pbio?.weight_kg), delta: pdfDelta(bio?.weight_kg, pbio?.weight_kg) },
    { label: 'IMC', cur: pdfFormatNumber(a.bmi), prevVal: pdfFormatNumber(prev?.bmi), delta: pdfDelta(a.bmi, prev?.bmi) },
    { label: 'Classificação IMC', cur: pdfText(a.bmi_classification), prevVal: pdfText(prev?.bmi_classification) },
    { label: '% Gordura Corporal', cur: pdfFormatNumber(bio?.body_fat_percentage), prevVal: pdfFormatNumber(pbio?.body_fat_percentage), delta: pdfDelta(bio?.body_fat_percentage, pbio?.body_fat_percentage) },
    { label: 'Classificação Gordura', cur: pdfText(a.body_fat_classification), prevVal: pdfText(prev?.body_fat_classification) },
    { label: '% Músculo Esquelético', cur: pdfFormatNumber(bio?.skeletal_muscle_percentage), prevVal: pdfFormatNumber(pbio?.skeletal_muscle_percentage), delta: pdfDelta(bio?.skeletal_muscle_percentage, pbio?.skeletal_muscle_percentage) },
    { label: 'Metabolismo Basal (kcal)', cur: pdfFormatNumber(bio?.resting_metabolism_kcal, 0), prevVal: pdfFormatNumber(pbio?.resting_metabolism_kcal, 0), delta: pdfDelta(bio?.resting_metabolism_kcal, pbio?.resting_metabolism_kcal, 0) },
    { label: 'Idade Corporal (anos)', cur: pdfFormatNumber(bio?.body_age, 0), prevVal: pdfFormatNumber(pbio?.body_age, 0), delta: pdfDelta(bio?.body_age, pbio?.body_age, 0) },
    { label: 'Gordura Visceral (nível)', cur: pdfFormatNumber(bio?.visceral_fat_level, 0), prevVal: pdfFormatNumber(pbio?.visceral_fat_level, 0), delta: pdfDelta(bio?.visceral_fat_level, pbio?.visceral_fat_level, 0) },
    { label: 'Risco Visceral', cur: pdfVisceralLabel(a.visceral_risk), prevVal: prev ? pdfVisceralLabel(prev.visceral_risk) : '—' },
    { label: '% Água Corporal', cur: pdfFormatNumber(bio?.water_percentage), prevVal: pdfFormatNumber(pbio?.water_percentage), delta: pdfDelta(bio?.water_percentage, pbio?.water_percentage) },
    { label: 'Massa Gorda (kg)', cur: pdfFormatNumber(a.fat_mass_kg), prevVal: pdfFormatNumber(prev?.fat_mass_kg), delta: pdfDelta(a.fat_mass_kg, prev?.fat_mass_kg) },
    { label: 'Massa Magra (kg)', cur: pdfFormatNumber(a.lean_mass_kg), prevVal: pdfFormatNumber(prev?.lean_mass_kg), delta: pdfDelta(a.lean_mass_kg, prev?.lean_mass_kg) },
    { label: 'Perfil (Bioimpedância)', cur: pdfFormatNumber(bio?.perfil_bioimpedancia, 0), prevVal: pdfFormatNumber(pbio?.perfil_bioimpedancia, 0) },
    { label: 'Modo Atleta', cur: pdfBoolLabel(bio?.is_athlete), prevVal: pdfBoolLabel(pbio?.is_athlete) },
  ], true);

  // ---- Circunferências ----
  const cir = a.circunferencias;
  const pcir = prev?.circunferencias;
  const cRow = (label: string, key: keyof typeof cir, digits = 1): Row => ({
    label,
    cur: pdfFormatNumber(cir?.[key] as number, digits),
    prevVal: pdfFormatNumber(pcir?.[key] as number, digits),
    delta: pdfDelta(cir?.[key] as number, pcir?.[key] as number, digits),
  });
  drawTable('Circunferências (cm)', [
    cRow('Pescoço', 'neck_cm'),
    cRow('Ombro', 'shoulder_cm'),
    cRow('Tórax', 'chest_cm'),
    cRow('Cintura', 'waist_cm'),
    cRow('Abdômen', 'abdomen_cm'),
    cRow('Quadril', 'hip_cm'),
    cRow('Braço D. (relaxado)', 'right_arm_relaxed_cm'),
    cRow('Braço E. (relaxado)', 'left_arm_relaxed_cm'),
    cRow('Braço D. (contraído)', 'right_arm_flexed_cm'),
    cRow('Braço E. (contraído)', 'left_arm_flexed_cm'),
    cRow('Antebraço D.', 'right_forearm_cm'),
    cRow('Antebraço E.', 'left_forearm_cm'),
    cRow('Coxa D. (proximal)', 'right_thigh_proximal_cm'),
    cRow('Coxa E. (proximal)', 'left_thigh_proximal_cm'),
    cRow('Panturrilha D.', 'right_calf_cm'),
    cRow('Panturrilha E.', 'left_calf_cm'),
    { label: 'RCQ (Cintura/Quadril)', cur: pdfFormatNumber(a.rcq, 2), prevVal: pdfFormatNumber(prev?.rcq, 2), delta: pdfDelta(a.rcq, prev?.rcq, 2) },
  ], true);

  // ---- Dobras Cutâneas ----
  const sk = a.dobras_cutaneas;
  const psk = prev?.dobras_cutaneas;
  const sRow = (label: string, key: keyof typeof sk): Row => ({
    label,
    cur: pdfFormatNumber(sk?.[key] as number),
    prevVal: pdfFormatNumber(psk?.[key] as number),
    delta: pdfDelta(sk?.[key] as number, psk?.[key] as number),
  });
  drawTable('Dobras Cutâneas (mm)', [
    { label: 'Protocolo', cur: pdfProtocolLabel(sk?.protocol), prevVal: pdfProtocolLabel(psk?.protocol) },
    sRow('Tríceps', 'triceps_mm'),
    sRow('Bíceps', 'biceps_mm'),
    sRow('Subescapular', 'subscapular_mm'),
    sRow('Peitoral', 'chest_mm'),
    sRow('Axilar Média', 'midaxillary_mm'),
    sRow('Supra-ilíaca', 'suprailiac_mm'),
    sRow('Abdominal', 'abdominal_mm'),
    sRow('Coxa', 'mid_thigh_mm'),
    sRow('Panturrilha', 'calf_mm'),
    { label: 'Somatório (mm)', cur: pdfFormatNumber(a.skinfolds_sum_mm), prevVal: pdfFormatNumber(prev?.skinfolds_sum_mm), delta: pdfDelta(a.skinfolds_sum_mm, prev?.skinfolds_sum_mm) },
    { label: '% Gordura (dobras)', cur: pdfFormatNumber(a.skinfolds_fat_percentage), prevVal: pdfFormatNumber(prev?.skinfolds_fat_percentage), delta: pdfDelta(a.skinfolds_fat_percentage, prev?.skinfolds_fat_percentage) },
  ], true);

  // ---- Anamnese ----
  const an = student.anamneses;
  drawTable('Anamnese / Histórico de Saúde', [
    { label: 'Condição cardíaca', cur: an ? pdfBoolLabel(an.cardiac_condition) : '—' },
    { label: 'Dor articular', cur: an ? pdfBoolLabel(an.joint_pain) : '—' },
    { label: 'Dor no peito ao exercitar', cur: an ? pdfBoolLabel(an.chest_pain_during_exercise) : '—' },
    { label: 'Cirurgia recente', cur: an ? pdfText(an.recent_surgery_description) : '—' },
    { label: 'Medicações em uso', cur: an ? pdfText(an.active_medications) : '—' },
    { label: 'Observações', cur: an ? pdfText(an.notes) : '—' },
  ], false);

  // ======================= RODAPÉ EM TODAS AS PÁGINAS =======================
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    setDraw(C.line);
    doc.setLineWidth(0.3);
    doc.line(M, FOOTER_Y - 3, PAGE_W - M, FOOTER_Y - 3);
    setText(C.faint);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Personal Trainer: ${pdfText(trainerName)}`, M, FOOTER_Y);
    doc.text('FocusPT — Documento gerado automaticamente', PAGE_W / 2, FOOTER_Y, { align: 'center' });
    doc.text(`Página ${p} de ${pageCount}`, PAGE_W - M, FOOTER_Y, { align: 'right' });
  }

  return doc;
}
