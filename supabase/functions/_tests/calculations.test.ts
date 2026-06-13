// deno-lint-ignore-file
import { assertEquals, assertAlmostEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  calcBmi, classifyBmi,
  classifyBodyFat, classifySkeletalMuscle,
  classifyVisceral, calcJacksonPollock7,
  calcRcq, classifyRcq, calcAge,
} from '../_shared/calculations.ts';

// =============================================
// BMI
// =============================================
Deno.test('calcBmi - peso normal', () => {
  assertEquals(calcBmi(70, 175), 22.86);
});

Deno.test('calcBmi - sobrepeso', () => {
  assertEquals(calcBmi(88, 175), 28.73);
});

Deno.test('classifyBmi - abaixo do peso', () => {
  assertEquals(classifyBmi(17.9), 'Abaixo do peso');
});

Deno.test('classifyBmi - peso normal', () => {
  assertEquals(classifyBmi(22.0), 'Peso normal');
});

Deno.test('classifyBmi - sobrepeso', () => {
  assertEquals(classifyBmi(27.5), 'Sobrepeso');
});

Deno.test('classifyBmi - obesidade I', () => {
  assertEquals(classifyBmi(32.0), 'Obesidade Grau I');
});

Deno.test('classifyBmi - obesidade II', () => {
  assertEquals(classifyBmi(37.0), 'Obesidade Grau II');
});

Deno.test('classifyBmi - obesidade III', () => {
  assertEquals(classifyBmi(42.0), 'Obesidade Grau III');
});

// =============================================
// Body Fat Classification
// =============================================
Deno.test('classifyBodyFat - homem jovem excelente', () => {
  assertEquals(classifyBodyFat('MALE', 25, 10), 'Excelente');
});

Deno.test('classifyBodyFat - homem jovem normal', () => {
  assertEquals(classifyBodyFat('MALE', 25, 19), 'Normal');
});

Deno.test('classifyBodyFat - homem jovem muito alto', () => {
  assertEquals(classifyBodyFat('MALE', 25, 30), 'Muito Alto');
});

Deno.test('classifyBodyFat - mulher meia idade normal', () => {
  assertEquals(classifyBodyFat('FEMALE', 45, 27), 'Normal');
});

Deno.test('classifyBodyFat - mulher senior alto', () => {
  assertEquals(classifyBodyFat('FEMALE', 55, 34), 'Alto');
});

// =============================================
// Skeletal Muscle Classification
// =============================================
Deno.test('classifySkeletalMuscle - homem jovem alto', () => {
  assertEquals(classifySkeletalMuscle('MALE', 30, 42), 'Alto');
});

Deno.test('classifySkeletalMuscle - homem jovem normal', () => {
  assertEquals(classifySkeletalMuscle('MALE', 30, 36), 'Normal');
});

Deno.test('classifySkeletalMuscle - homem jovem baixo', () => {
  assertEquals(classifySkeletalMuscle('MALE', 30, 25), 'Baixo');
});

Deno.test('classifySkeletalMuscle - mulher jovem normal', () => {
  assertEquals(classifySkeletalMuscle('FEMALE', 28, 30), 'Normal');
});

// =============================================
// Visceral
// =============================================
Deno.test('classifyVisceral - normal', () => {
  assertEquals(classifyVisceral(9), 'NORMAL');
});

Deno.test('classifyVisceral - high (exato 10)', () => {
  assertEquals(classifyVisceral(10), 'HIGH');
});

Deno.test('classifyVisceral - high (14)', () => {
  assertEquals(classifyVisceral(14), 'HIGH');
});

Deno.test('classifyVisceral - very high', () => {
  assertEquals(classifyVisceral(15), 'VERY_HIGH');
});

Deno.test('classifyVisceral - very high extremo', () => {
  assertEquals(classifyVisceral(30), 'VERY_HIGH');
});

// =============================================
// Jackson & Pollock 7 dobras
// =============================================
Deno.test('calcJacksonPollock7 - homem referência', () => {
  const result = calcJacksonPollock7('MALE', 36, 10, 12, 12, 14, 22, 16, 18);
  // sum7 = 104, density ≈ 1.0713, fat% ≈ 12.3
  assertAlmostEquals(result, 12.0, 3);
});

Deno.test('calcJacksonPollock7 - mulher referência', () => {
  const result = calcJacksonPollock7('FEMALE', 37, 0, 0, 15, 17, 0, 20, 22);
  // result should be positive and < 50
  assertEquals(result > 0 && result < 50, true);
});

Deno.test('calcJacksonPollock7 - valores altos resultam em gordura maior', () => {
  const baixo = calcJacksonPollock7('MALE', 30, 5, 5, 5, 5, 10, 8, 10);
  const alto = calcJacksonPollock7('MALE', 30, 20, 25, 25, 25, 40, 30, 35);
  assertEquals(alto > baixo, true);
});

// =============================================
// RCQ
// =============================================
Deno.test('calcRcq - cálculo correto', () => {
  assertEquals(calcRcq(90, 101), 0.8911);
});

Deno.test('calcRcq - cintura igual quadril = 1.0', () => {
  assertEquals(calcRcq(100, 100), 1.0);
});

Deno.test('classifyRcq - homem baixo risco', () => {
  assertEquals(classifyRcq('MALE', 0.80), 'Baixo');
});

Deno.test('classifyRcq - homem moderado', () => {
  assertEquals(classifyRcq('MALE', 0.85), 'Moderado');
});

Deno.test('classifyRcq - homem alto', () => {
  assertEquals(classifyRcq('MALE', 0.91), 'Alto');
});

Deno.test('classifyRcq - homem muito alto', () => {
  assertEquals(classifyRcq('MALE', 1.0), 'Muito Alto');
});

Deno.test('classifyRcq - mulher baixo', () => {
  assertEquals(classifyRcq('FEMALE', 0.68), 'Baixo');
});

Deno.test('classifyRcq - mulher muito alto', () => {
  assertEquals(classifyRcq('FEMALE', 0.90), 'Muito Alto');
});

// =============================================
// Age calculation
// =============================================
Deno.test('calcAge - retorna número positivo', () => {
  const age = calcAge('1990-01-01');
  assertEquals(age >= 34 && age <= 40, true);
});

Deno.test('calcAge - data futura retorna valor negativo ou zero', () => {
  const age = calcAge('2099-01-01');
  assertEquals(age <= 0, true);
});
