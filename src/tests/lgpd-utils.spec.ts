import { describe, it, expect } from 'vitest';
import {
  LGPD_TERM_VERSION,
  LGPD_TERM_TEXT,
  buildConsentRecord,
  formatLgpdDate,
  isSignatureBase64Valid,
  extractBase64FromDataUrl,
  isDataUrlSignatureEmpty,
  getLgpdStatusLabel,
  getLgpdStatusColor,
  getCurrentTermVersion,
} from '../app/lgpd-utils';

// =============================================
// Term Version
// =============================================
describe('getCurrentTermVersion', () => {
  it('retorna versão como string não vazia', () => {
    expect(getCurrentTermVersion()).toBeTruthy();
    expect(typeof getCurrentTermVersion()).toBe('string');
  });

  it('versão é 1.0', () => {
    expect(getCurrentTermVersion()).toBe('1.0');
  });

  it('LGPD_TERM_VERSION é igual ao retorno da função', () => {
    expect(getCurrentTermVersion()).toBe(LGPD_TERM_VERSION);
  });
});

// =============================================
// LGPD Term Text
// =============================================
describe('LGPD_TERM_TEXT', () => {
  it('contém a palavra LGPD', () => {
    expect(LGPD_TERM_TEXT).toContain('LGPD');
  });

  it('menciona Lei 13.709/2018', () => {
    expect(LGPD_TERM_TEXT).toContain('13.709/2018');
  });

  it('menciona direitos do titular', () => {
    expect(LGPD_TERM_TEXT.toUpperCase()).toContain('DIREITOS DO TITULAR');
  });

  it('menciona consentimento', () => {
    expect(LGPD_TERM_TEXT.toLowerCase()).toContain('consentimento');
  });

  it('não está vazio', () => {
    expect(LGPD_TERM_TEXT.length).toBeGreaterThan(200);
  });
});

// =============================================
// formatLgpdDate
// =============================================
describe('formatLgpdDate', () => {
  it('formata data no padrão dd/MM/yyyy', () => {
    const date = new Date('2026-06-12T10:30:00');
    const result = formatLgpdDate(date);
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('inclui hora e minuto', () => {
    const date = new Date('2026-06-12T10:30:00');
    const result = formatLgpdDate(date);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('retorna string não vazia para qualquer data válida', () => {
    expect(formatLgpdDate(new Date())).toBeTruthy();
  });
});

// =============================================
// buildConsentRecord
// =============================================
describe('buildConsentRecord', () => {
  it('contém o nome do aluno', () => {
    const result = buildConsentRecord('Maria Silva', new Date(), '1.0');
    expect(result).toContain('Maria Silva');
  });

  it('contém a versão do termo', () => {
    const result = buildConsentRecord('João', new Date(), '1.0');
    expect(result).toContain('1.0');
  });

  it('contém a palavra Consentimento', () => {
    const result = buildConsentRecord('João', new Date(), '1.0');
    expect(result).toContain('Consentimento');
  });

  it('retorna string diferente para nomes diferentes', () => {
    const r1 = buildConsentRecord('Ana', new Date(), '1.0');
    const r2 = buildConsentRecord('Bruno', new Date(), '1.0');
    expect(r1).not.toBe(r2);
  });
});

// =============================================
// isSignatureBase64Valid
// =============================================
describe('isSignatureBase64Valid', () => {
  it('retorna false para string vazia', () => {
    expect(isSignatureBase64Valid('')).toBe(false);
  });

  it('retorna false para null/undefined', () => {
    expect(isSignatureBase64Valid(null as unknown as string)).toBe(false);
    expect(isSignatureBase64Valid(undefined as unknown as string)).toBe(false);
  });

  it('retorna false para string muito curta (< 100 chars)', () => {
    expect(isSignatureBase64Valid('abc123')).toBe(false);
    expect(isSignatureBase64Valid('A'.repeat(99))).toBe(false);
  });

  it('retorna false para string com caracteres inválidos', () => {
    expect(isSignatureBase64Valid('A'.repeat(100) + '!')).toBe(false);
    expect(isSignatureBase64Valid('A'.repeat(100) + '@#$')).toBe(false);
  });

  it('retorna true para base64 válido com comprimento suficiente', () => {
    // base64 válido com exatamente 200 caracteres
    const valid = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.repeat(4);
    expect(isSignatureBase64Valid(valid)).toBe(true);
  });

  it('retorna true para base64 com padding =', () => {
    const valid = ('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.repeat(4)) + '==';
    expect(isSignatureBase64Valid(valid)).toBe(true);
  });

  it('limite exato: 99 chars inválido, 100 chars válido (boundary < 100)', () => {
    const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    expect(isSignatureBase64Valid(b64chars.slice(0, 64) + b64chars.slice(0, 35))).toBe(false); // 99 chars
    expect(isSignatureBase64Valid(b64chars.slice(0, 64) + b64chars.slice(0, 36))).toBe(true);  // 100 chars
  });
});

// =============================================
// extractBase64FromDataUrl
// =============================================
describe('extractBase64FromDataUrl', () => {
  it('remove o prefixo data:image/png;base64,', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    expect(extractBase64FromDataUrl(dataUrl)).toBe('iVBORw0KGgo=');
  });

  it('retorna string original se não tiver prefixo', () => {
    expect(extractBase64FromDataUrl('iVBORw0KGgo=')).toBe('iVBORw0KGgo=');
  });

  it('funciona com data:image/jpeg;base64,', () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQ=';
    expect(extractBase64FromDataUrl(dataUrl)).toBe('/9j/4AAQ=');
  });

  it('retorna string vazia para entrada vazia', () => {
    expect(extractBase64FromDataUrl('')).toBe('');
  });
});

// =============================================
// isDataUrlSignatureEmpty
// =============================================
describe('isDataUrlSignatureEmpty', () => {
  it('canvas em branco (base64 muito curto) é considerado vazio', () => {
    const blank = 'data:image/png;base64,' + 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQ==';
    expect(isDataUrlSignatureEmpty(blank)).toBe(true);
  });

  it('assinatura real (base64 longo) não é vazia', () => {
    const realSignature = 'data:image/png;base64,' + 'A'.repeat(500);
    expect(isDataUrlSignatureEmpty(realSignature)).toBe(false);
  });

  it('string completamente vazia é considerada vazia', () => {
    expect(isDataUrlSignatureEmpty('')).toBe(true);
  });
});

// =============================================
// getLgpdStatusLabel
// =============================================
describe('getLgpdStatusLabel', () => {
  it('ACCEPTED retorna label correto', () => {
    expect(getLgpdStatusLabel('ACCEPTED')).toBe('Consentimento Assinado');
  });

  it('PENDING retorna label correto', () => {
    expect(getLgpdStatusLabel('PENDING')).toBe('Aceite Pendente');
  });

  it('retorna string não vazia para ambos os status', () => {
    expect(getLgpdStatusLabel('ACCEPTED').length).toBeGreaterThan(0);
    expect(getLgpdStatusLabel('PENDING').length).toBeGreaterThan(0);
  });

  it('labels são diferentes entre si', () => {
    expect(getLgpdStatusLabel('ACCEPTED')).not.toBe(getLgpdStatusLabel('PENDING'));
  });
});

// =============================================
// getLgpdStatusColor
// =============================================
describe('getLgpdStatusColor', () => {
  it('ACCEPTED retorna cor verde', () => {
    expect(getLgpdStatusColor('ACCEPTED')).toContain('emerald');
  });

  it('PENDING retorna cor âmbar', () => {
    expect(getLgpdStatusColor('PENDING')).toContain('amber');
  });

  it('cores são diferentes entre si', () => {
    expect(getLgpdStatusColor('ACCEPTED')).not.toBe(getLgpdStatusColor('PENDING'));
  });
});
