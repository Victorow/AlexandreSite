import { describe, it, expect } from 'vitest';
import {
  calcBmi,
  classifyBmi,
  classifyBodyFat,
  classifySkeletalMuscle,
  classifyVisceral,
  calcJacksonPollock7,
  calcRcq,
  classifyRcq,
  calcAge,
} from '../../supabase/functions/_shared/calculations';

// =============================================
// BMI
// =============================================
describe('calcBmi', () => {
  it('calcula IMC corretamente para peso normal', () => {
    expect(calcBmi(70, 175)).toBe(22.86);
  });

  it('calcula IMC corretamente para sobrepeso', () => {
    expect(calcBmi(88, 175)).toBe(28.73);
  });

  it('calcula IMC com altura diferente', () => {
    expect(calcBmi(72, 162)).toBeCloseTo(27.43, 1);
  });
});

describe('classifyBmi', () => {
  it('abaixo do peso (< 18.5)', () => {
    expect(classifyBmi(17.9)).toBe('Abaixo do peso');
  });

  it('peso normal (18.5 - 24.9)', () => {
    expect(classifyBmi(22.0)).toBe('Peso normal');
  });

  it('limite inferior peso normal (18.5)', () => {
    expect(classifyBmi(18.5)).toBe('Peso normal');
  });

  it('sobrepeso (25 - 29.9)', () => {
    expect(classifyBmi(27.5)).toBe('Sobrepeso');
  });

  it('obesidade grau I (30 - 34.9)', () => {
    expect(classifyBmi(32.0)).toBe('Obesidade Grau I');
  });

  it('obesidade grau II (35 - 39.9)', () => {
    expect(classifyBmi(37.0)).toBe('Obesidade Grau II');
  });

  it('obesidade grau III (>= 40)', () => {
    expect(classifyBmi(42.0)).toBe('Obesidade Grau III');
  });
});

// =============================================
// Body Fat Classification
// =============================================
describe('classifyBodyFat', () => {
  it('homem < 30 anos - Excelente', () => {
    expect(classifyBodyFat('MALE', 25, 10)).toBe('Excelente');
  });

  it('homem < 30 anos - Bom', () => {
    expect(classifyBodyFat('MALE', 25, 14)).toBe('Bom');
  });

  it('homem < 30 anos - Normal', () => {
    expect(classifyBodyFat('MALE', 25, 19)).toBe('Normal');
  });

  it('homem < 30 anos - Alto', () => {
    expect(classifyBodyFat('MALE', 25, 24)).toBe('Alto');
  });

  it('homem < 30 anos - Muito Alto', () => {
    expect(classifyBodyFat('MALE', 25, 30)).toBe('Muito Alto');
  });

  it('homem 30-39 anos - Normal', () => {
    expect(classifyBodyFat('MALE', 35, 20)).toBe('Normal');
  });

  it('homem 40-49 anos - Normal', () => {
    expect(classifyBodyFat('MALE', 45, 22)).toBe('Normal');
  });

  it('homem >= 50 anos - Normal', () => {
    expect(classifyBodyFat('MALE', 55, 24)).toBe('Normal');
  });

  it('mulher < 30 anos - Normal', () => {
    expect(classifyBodyFat('FEMALE', 25, 22)).toBe('Normal');
  });

  it('mulher 40-49 anos - Normal', () => {
    expect(classifyBodyFat('FEMALE', 45, 27)).toBe('Normal');
  });

  it('mulher >= 50 anos - Alto', () => {
    expect(classifyBodyFat('FEMALE', 55, 34)).toBe('Alto');
  });
});

// =============================================
// Skeletal Muscle Classification
// =============================================
describe('classifySkeletalMuscle', () => {
  it('homem < 40 anos - Alto (>= 40%)', () => {
    expect(classifySkeletalMuscle('MALE', 30, 42)).toBe('Alto');
  });

  it('homem < 40 anos - Normal (33-39%)', () => {
    expect(classifySkeletalMuscle('MALE', 30, 36)).toBe('Normal');
  });

  it('homem < 40 anos - Baixo (< 33%)', () => {
    expect(classifySkeletalMuscle('MALE', 30, 25)).toBe('Baixo');
  });

  it('homem >= 40 anos - Alto (>= 37%)', () => {
    expect(classifySkeletalMuscle('MALE', 45, 38)).toBe('Alto');
  });

  it('homem >= 40 anos - Baixo (< 30%)', () => {
    expect(classifySkeletalMuscle('MALE', 45, 28)).toBe('Baixo');
  });

  it('mulher < 40 anos - Normal (28-33%)', () => {
    expect(classifySkeletalMuscle('FEMALE', 28, 30)).toBe('Normal');
  });

  it('mulher >= 40 anos - Alto (>= 32%)', () => {
    expect(classifySkeletalMuscle('FEMALE', 45, 33)).toBe('Alto');
  });
});

// =============================================
// Visceral Fat Classification (Omron 1-30)
// =============================================
describe('classifyVisceral', () => {
  it('nível 1 - NORMAL', () => expect(classifyVisceral(1)).toBe('NORMAL'));
  it('nível 9 - NORMAL (limite)', () => expect(classifyVisceral(9)).toBe('NORMAL'));
  it('nível 10 - HIGH (início)', () => expect(classifyVisceral(10)).toBe('HIGH'));
  it('nível 14 - HIGH (limite)', () => expect(classifyVisceral(14)).toBe('HIGH'));
  it('nível 15 - VERY_HIGH (início)', () => expect(classifyVisceral(15)).toBe('VERY_HIGH'));
  it('nível 30 - VERY_HIGH (máximo)', () => expect(classifyVisceral(30)).toBe('VERY_HIGH'));
});

// =============================================
// Jackson & Pollock 7 Dobras
// =============================================
describe('calcJacksonPollock7', () => {
  it('homem adulto - retorna % gordura dentro do esperado', () => {
    const result = calcJacksonPollock7('MALE', 36, 10, 12, 12, 14, 22, 16, 18);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(50);
  });

  it('mulher adulta - retorna % gordura dentro do esperado', () => {
    const result = calcJacksonPollock7('FEMALE', 37, 8, 10, 15, 17, 20, 20, 22);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(60);
  });

  it('dobras maiores resultam em % gordura maior', () => {
    const baixo = calcJacksonPollock7('MALE', 30, 5, 5, 5, 5, 10, 8, 10);
    const alto = calcJacksonPollock7('MALE', 30, 20, 25, 25, 25, 40, 30, 35);
    expect(alto).toBeGreaterThan(baixo);
  });

  it('resultado tem 2 casas decimais', () => {
    const result = calcJacksonPollock7('MALE', 30, 10, 12, 12, 14, 20, 16, 18);
    expect(Number.isFinite(result)).toBe(true);
    expect(String(result).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });
});

// =============================================
// RCQ — Relação Cintura/Quadril
// =============================================
describe('calcRcq', () => {
  it('calcula RCQ corretamente', () => {
    expect(calcRcq(90, 101)).toBe(0.8911);
  });

  it('cintura igual ao quadril = 1.0', () => {
    expect(calcRcq(100, 100)).toBe(1.0);
  });

  it('cintura menor que quadril < 1', () => {
    expect(calcRcq(80, 100)).toBeLessThan(1);
  });
});

describe('classifyRcq', () => {
  it('homem - Baixo (< 0.83)', () => {
    expect(classifyRcq('MALE', 0.80)).toBe('Baixo');
  });

  it('homem - Moderado (0.83 - 0.87)', () => {
    expect(classifyRcq('MALE', 0.85)).toBe('Moderado');
  });

  it('homem - Alto (0.88 - 0.94)', () => {
    expect(classifyRcq('MALE', 0.91)).toBe('Alto');
  });

  it('homem - Muito Alto (>= 0.95)', () => {
    expect(classifyRcq('MALE', 1.0)).toBe('Muito Alto');
  });

  it('mulher - Baixo (< 0.71)', () => {
    expect(classifyRcq('FEMALE', 0.68)).toBe('Baixo');
  });

  it('mulher - Moderado (0.71 - 0.76)', () => {
    expect(classifyRcq('FEMALE', 0.74)).toBe('Moderado');
  });

  it('mulher - Alto (0.77 - 0.81)', () => {
    expect(classifyRcq('FEMALE', 0.79)).toBe('Alto');
  });

  it('mulher - Muito Alto (>= 0.82)', () => {
    expect(classifyRcq('FEMALE', 0.90)).toBe('Muito Alto');
  });
});

// =============================================
// Age Calculation
// =============================================
describe('calcAge', () => {
  it('retorna número inteiro positivo para data passada', () => {
    const age = calcAge('1990-01-01');
    expect(age).toBeGreaterThan(30);
    expect(Number.isInteger(age)).toBe(true);
  });

  it('data futura retorna número negativo', () => {
    const age = calcAge('2099-01-01');
    expect(age).toBeLessThan(0);
  });

  it('data de hoje menos 1 ano = 1', () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    const iso = d.toISOString().split('T')[0];
    expect(calcAge(iso)).toBe(1);
  });
});
