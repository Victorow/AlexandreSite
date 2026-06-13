import { describe, it, expect } from 'vitest';
import {
  shouldConvertCmToMm,
  cmToMm,
  fieldRangeHint,
  FIELD_RANGES,
} from '../app/assessment-utils';

// =============================================
// shouldConvertCmToMm
// =============================================
describe('shouldConvertCmToMm', () => {
  it('valores entre 0 e 6 (exclusivo) são tratados como cm', () => {
    expect(shouldConvertCmToMm(2.5)).toBe(true);
    expect(shouldConvertCmToMm(0.8)).toBe(true);
    expect(shouldConvertCmToMm(5.9)).toBe(true);
  });

  it('valores >= 6 são tratados como mm (não converte)', () => {
    expect(shouldConvertCmToMm(6)).toBe(false);
    expect(shouldConvertCmToMm(12)).toBe(false);
    expect(shouldConvertCmToMm(40)).toBe(false);
  });

  it('zero, negativos e NaN não convertem', () => {
    expect(shouldConvertCmToMm(0)).toBe(false);
    expect(shouldConvertCmToMm(-3)).toBe(false);
    expect(shouldConvertCmToMm(NaN)).toBe(false);
  });
});

// =============================================
// cmToMm
// =============================================
describe('cmToMm', () => {
  it('multiplica por 10', () => {
    expect(cmToMm(2.5)).toBe(25);
    expect(cmToMm(0.8)).toBe(8);
    expect(cmToMm(1.25)).toBe(12.5);
  });

  it('arredonda para 1 casa decimal', () => {
    expect(cmToMm(0.123)).toBe(1.2);
  });
});

// =============================================
// fieldRangeHint
// =============================================
describe('fieldRangeHint', () => {
  it('campos > 0 mostram "Maior que zero"', () => {
    expect(fieldRangeHint('weightKg')).toBe('Maior que zero');
    expect(fieldRangeHint('restingMetabolismKcal')).toBe('Maior que zero');
  });

  it('idade corporal mostra a faixa 10 a 100', () => {
    expect(fieldRangeHint('bodyAge')).toBe('Entre 10 e 100');
  });

  it('gordura visceral mostra a faixa 1 a 30', () => {
    expect(fieldRangeHint('visceralFatLevel')).toBe('Entre 1 e 30');
  });

  it('perfil de bioimpedância mostra a faixa 1 a 4', () => {
    expect(fieldRangeHint('perfilBioimpedancia')).toBe('Entre 1 e 4');
  });

  it('campo desconhecido tem fallback genérico', () => {
    expect(fieldRangeHint('campoQualquer')).toBe('Obrigatório, maior que zero');
  });
});

// =============================================
// FIELD_RANGES (consistência com o banco)
// =============================================
describe('FIELD_RANGES', () => {
  it('idade corporal: 10 a 100 (igual ao CHECK do banco)', () => {
    expect(FIELD_RANGES['bodyAge']).toEqual({ min: 10, max: 100 });
  });

  it('água corporal: 0 a 100', () => {
    expect(FIELD_RANGES['waterPercentage']).toEqual({ min: 0, max: 100 });
  });

  it('gordura visceral: 1 a 30', () => {
    expect(FIELD_RANGES['visceralFatLevel']).toEqual({ min: 1, max: 30 });
  });
});
