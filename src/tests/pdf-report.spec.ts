import { describe, it, expect } from 'vitest';
import {
  pdfFormatNumber,
  pdfFormatDate,
  pdfAgeFromBirth,
  pdfGenderLabel,
  pdfVisceralLabel,
  pdfDelta,
} from '../app/pdf-report';

// =============================================
// pdfFormatNumber
// =============================================
describe('pdfFormatNumber', () => {
  it('formata com 1 casa por padrão', () => {
    expect(pdfFormatNumber(12.345)).toBe('12.3');
  });

  it('respeita o número de casas', () => {
    expect(pdfFormatNumber(12.345, 2)).toBe('12.35');
    expect(pdfFormatNumber(12.345, 0)).toBe('12');
  });

  it('retorna — para null/undefined/NaN', () => {
    expect(pdfFormatNumber(null)).toBe('—');
    expect(pdfFormatNumber(undefined)).toBe('—');
    expect(pdfFormatNumber(NaN)).toBe('—');
  });

  it('formata zero corretamente', () => {
    expect(pdfFormatNumber(0)).toBe('0.0');
  });
});

// =============================================
// pdfFormatDate
// =============================================
describe('pdfFormatDate', () => {
  it('converte YYYY-MM-DD para DD/MM/YYYY sem bug de fuso', () => {
    expect(pdfFormatDate('2026-06-13')).toBe('13/06/2026');
  });

  it('funciona com timestamp ISO completo', () => {
    expect(pdfFormatDate('2026-01-05T10:30:00Z')).toBe('05/01/2026');
  });

  it('retorna — para vazio/null', () => {
    expect(pdfFormatDate('')).toBe('—');
    expect(pdfFormatDate(null)).toBe('—');
    expect(pdfFormatDate(undefined)).toBe('—');
  });

  it('retorna — para data inválida', () => {
    expect(pdfFormatDate('not-a-date')).toBe('—');
  });
});

// =============================================
// pdfAgeFromBirth
// =============================================
describe('pdfAgeFromBirth', () => {
  it('calcula idade básica', () => {
    expect(pdfAgeFromBirth('2000-01-01', new Date('2026-06-13'))).toBe(26);
  });

  it('ainda não fez aniversário no ano', () => {
    expect(pdfAgeFromBirth('2000-12-31', new Date('2026-06-13'))).toBe(25);
  });

  it('exatamente no aniversário', () => {
    expect(pdfAgeFromBirth('2000-06-13', new Date('2026-06-13'))).toBe(26);
  });

  it('um dia antes do aniversário', () => {
    expect(pdfAgeFromBirth('2000-06-14', new Date('2026-06-13'))).toBe(25);
  });
});

// =============================================
// pdfGenderLabel
// =============================================
describe('pdfGenderLabel', () => {
  it('MALE → Masculino', () => {
    expect(pdfGenderLabel('MALE')).toBe('Masculino');
  });
  it('FEMALE → Feminino', () => {
    expect(pdfGenderLabel('FEMALE')).toBe('Feminino');
  });
});

// =============================================
// pdfVisceralLabel
// =============================================
describe('pdfVisceralLabel', () => {
  it('NORMAL → Normal', () => {
    expect(pdfVisceralLabel('NORMAL')).toBe('Normal');
  });
  it('HIGH → Alto', () => {
    expect(pdfVisceralLabel('HIGH')).toBe('Alto');
  });
  it('VERY_HIGH → Muito Alto', () => {
    expect(pdfVisceralLabel('VERY_HIGH')).toBe('Muito Alto');
  });
});

// =============================================
// pdfDelta
// =============================================
describe('pdfDelta', () => {
  it('aumento → sinal + e dir up', () => {
    const d = pdfDelta(82, 80);
    expect(d.text).toBe('+2.0');
    expect(d.dir).toBe('up');
  });

  it('redução → sinal - e dir down', () => {
    const d = pdfDelta(78, 80);
    expect(d.text).toBe('-2.0');
    expect(d.dir).toBe('down');
  });

  it('sem variação → 0 e dir flat', () => {
    const d = pdfDelta(80, 80);
    expect(d.text).toBe('0');
    expect(d.dir).toBe('flat');
  });

  it('previous ausente → — e flat', () => {
    const d = pdfDelta(80, null);
    expect(d.text).toBe('—');
    expect(d.dir).toBe('flat');
  });

  it('current ausente → — e flat', () => {
    const d = pdfDelta(undefined, 80);
    expect(d.text).toBe('—');
    expect(d.dir).toBe('flat');
  });

  it('respeita casas decimais', () => {
    const d = pdfDelta(0.92, 0.90, 2);
    expect(d.text).toBe('+0.02');
    expect(d.dir).toBe('up');
  });

  it('diferença que arredonda para zero é flat', () => {
    const d = pdfDelta(80.04, 80.0, 1);
    expect(d.dir).toBe('flat');
    expect(d.text).toBe('0');
  });
});
