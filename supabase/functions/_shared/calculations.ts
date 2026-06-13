// All anthropometric calculation logic — pure functions, easily testable

export function calcBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 100) / 100;
}

export function classifyBmi(bmi: number): string {
  if (bmi < 18.5) return 'Abaixo do peso';
  if (bmi < 25.0) return 'Peso normal';
  if (bmi < 30.0) return 'Sobrepeso';
  if (bmi < 35.0) return 'Obesidade Grau I';
  if (bmi < 40.0) return 'Obesidade Grau II';
  return 'Obesidade Grau III';
}

export function classifyBodyFat(gender: 'MALE' | 'FEMALE', age: number, fatPct: number): string {
  const thresholds = gender === 'MALE'
    ? age < 30 ? [12, 17, 22, 27]
      : age < 40 ? [13, 18, 23, 28]
        : age < 50 ? [15, 20, 25, 30]
          : [17, 22, 27, 32]
    : age < 30 ? [17, 21, 26, 31]
      : age < 40 ? [18, 23, 28, 33]
        : age < 50 ? [20, 25, 30, 35]
          : [22, 27, 32, 37];

  if (fatPct < thresholds[0]) return 'Excelente';
  if (fatPct < thresholds[1]) return 'Bom';
  if (fatPct < thresholds[2]) return 'Normal';
  if (fatPct < thresholds[3]) return 'Alto';
  return 'Muito Alto';
}

export function classifySkeletalMuscle(gender: 'MALE' | 'FEMALE', age: number, musclePct: number): string {
  const [high, normal] = gender === 'MALE'
    ? age < 40 ? [40, 33] : [37, 30]
    : age < 40 ? [34, 28] : [32, 26];

  if (musclePct >= high) return 'Alto';
  if (musclePct >= normal) return 'Normal';
  return 'Baixo';
}

export function classifyVisceral(level: number): 'NORMAL' | 'HIGH' | 'VERY_HIGH' {
  if (level <= 9) return 'NORMAL';
  if (level <= 14) return 'HIGH';
  return 'VERY_HIGH';
}

// Jackson & Pollock 7-site formula
export function calcJacksonPollock7(
  gender: 'MALE' | 'FEMALE',
  age: number,
  chest: number,
  midaxillary: number,
  triceps: number,
  subscapular: number,
  abdominal: number,
  suprailiac: number,
  midThigh: number
): number {
  const sum7 = chest + midaxillary + triceps + subscapular + abdominal + suprailiac + midThigh;
  const density = gender === 'MALE'
    ? 1.112 - (0.00043499 * sum7) + (0.00000055 * sum7 * sum7) - (0.00028826 * age)
    : 1.097 - (0.00046971 * sum7) + (0.00000056 * sum7 * sum7) - (0.00012828 * age);
  return Math.round(((495 / density) - 450) * 100) / 100;
}

export function calcRcq(waistCm: number, hipCm: number): number {
  return Math.round((waistCm / hipCm) * 10000) / 10000;
}

export function classifyRcq(gender: 'MALE' | 'FEMALE', rcq: number): string {
  const thresholds = gender === 'MALE' ? [0.83, 0.88, 0.95] : [0.71, 0.77, 0.82];
  if (rcq < thresholds[0]) return 'Baixo';
  if (rcq < thresholds[1]) return 'Moderado';
  if (rcq < thresholds[2]) return 'Alto';
  return 'Muito Alto';
}

export function calcAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
