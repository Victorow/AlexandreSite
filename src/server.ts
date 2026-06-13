/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const browserDistFolder = join(import.meta.dirname, '../browser');
const dbFilePath = join(import.meta.dirname, 'database.json');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Handle JSON limit for Base64 photos
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

interface Student {
  id: string;
  name: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE';
  heightCm: number;
  goal: string;
  phoneNumber?: string;
  lgpdConsentStatus: 'PENDING' | 'ACCEPTED';
  anamnesis: {
    cardiacCondition: boolean;
    jointPain: boolean;
    chestPainDuringExercise: boolean;
    recentSurgeryDescription: string;
    activeMedications: string;
    notes: string;
  };
  assessments: any[];
  photos: any[];
}

function getInitialMockDatabase(): { students: Student[] } {
  return {
    students: [
      {
        id: 'std_carlos_silva',
        name: 'Carlos Silva',
        birthDate: '1998-03-12',
        gender: 'MALE',
        heightCm: 180,
        goal: 'Hipertrofia & Definição',
        phoneNumber: '5511999998888',
        lgpdConsentStatus: 'ACCEPTED',
        anamnesis: {
          cardiacCondition: false,
          jointPain: true,
          chestPainDuringExercise: false,
          recentSurgeryDescription: '',
          activeMedications: 'Nenhuma',
          notes: 'Sente leve desconforto no joelho direito ao agachar acima de 120kg. Foco no fortalecimento de quadríceps.'
        },
        photos: [
          {
            id: 'photo_1',
            date: '2026-03-10',
            category: 'FRENTE',
            image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&auto=format&fit=crop&q=60'
          },
          {
            id: 'photo_2',
            date: '2026-06-08',
            category: 'FRENTE',
            image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=60'
          }
        ],
        assessments: [
          {
            id: 'as_1',
            date: '2026-03-10',
            circumferences: {
              neckCm: 38,
              shoulderCm: 118,
              chestCm: 102,
              waistCm: 88,
              abdomenCm: 90,
              hipCm: 101,
              rightArmRelaxedCm: 35, leftArmRelaxedCm: 34.5,
              rightArmFlexedCm: 38, leftArmFlexedCm: 37.5,
              rightThighProximalCm: 58, leftThighProximalCm: 57.5,
              rightCalfCm: 38, leftCalfCm: 38
            },
            skinfolds: {
              tricepsMm: 12,
              bicepsMm: 6,
              subscapularMm: 15,
              chestMm: 14,
              midaxillaryMm: 12,
              suprailiacMm: 18,
              abdominalMm: 22,
              midThighMm: 16,
              calfMm: 10
            },
            bioimpedance: {
              weightKg: 85.2,
              bmi: 26.3,
              bodyFatPercentage: 19.8,
              skeletalMusclePercentage: 38.5,
              restingMetabolismKcal: 1820,
              bodyAge: 32,
              visceralFatLevel: 10
            },
            results: {
              bmi: 26.3,
              bmiClassification: 'Sobrepeso',
              bodyFatPercentage: 17.5,
              fatMassKg: 14.9,
              leanMassKg: 70.3,
              bodyFatClassification: 'Normal',
              visceralRisk: 'HIGH'
            }
          },
          {
            id: 'as_2',
            date: '2026-06-08',
            circumferences: {
              neckCm: 38,
              shoulderCm: 122,
              chestCm: 105,
              waistCm: 82,
              abdomenCm: 83,
              hipCm: 99,
              rightArmRelaxedCm: 36.5, leftArmRelaxedCm: 36,
              rightArmFlexedCm: 40.2, leftArmFlexedCm: 39.8,
              rightThighProximalCm: 60.5, leftThighProximalCm: 60,
              rightCalfCm: 38.5, leftCalfCm: 38.5
            },
            skinfolds: {
              tricepsMm: 9,
              bicepsMm: 4,
              subscapularMm: 11,
              chestMm: 9,
              midaxillaryMm: 9,
              suprailiacMm: 12,
              abdominalMm: 15,
              midThighMm: 11,
              calfMm: 8
            },
            bioimpedance: {
              weightKg: 81.8,
              bmi: 25.2,
              bodyFatPercentage: 13.5,
              skeletalMusclePercentage: 42.1,
              restingMetabolismKcal: 1890,
              bodyAge: 25,
              visceralFatLevel: 7
            },
            results: {
              bmi: 25.2,
              bmiClassification: 'Sobrepeso',
              bodyFatPercentage: 12.8,
              fatMassKg: 10.5,
              leanMassKg: 71.3,
              bodyFatClassification: 'Excelente (Atleta)',
              visceralRisk: 'NORMAL'
            }
          }
        ]
      },
      {
        id: 'std_maria_santos',
        name: 'Maria Santos',
        birthDate: '1991-08-24',
        gender: 'FEMALE',
        heightCm: 165,
        goal: 'Emagrecimento & Reabilitação',
        phoneNumber: '5511988887777',
        lgpdConsentStatus: 'ACCEPTED',
        anamnesis: {
          cardiacCondition: false,
          jointPain: false,
          chestPainDuringExercise: false,
          recentSurgeryDescription: '',
          activeMedications: 'Remédio Hipotireoidismo',
          notes: 'Diagnosticada com hipotireoidismo há 2 anos, regulado com medicamentos. Deseja emagrecer de forma saudável.'
        },
        photos: [
          {
            id: 'photo_3',
            date: '2026-02-15',
            category: 'FRENTE',
            image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=60'
          },
          {
            id: 'photo_4',
            date: '2026-05-15',
            category: 'FRENTE',
            image: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600&auto=format&fit=crop&q=60'
          }
        ],
        assessments: [
          {
            id: 'as_3',
            date: '2026-02-15',
            circumferences: {
              neckCm: 32,
              shoulderCm: 98,
              chestCm: 94,
              waistCm: 79,
              abdomenCm: 88,
              hipCm: 108,
              rightArmRelaxedCm: 29.5, leftArmRelaxedCm: 29,
              rightArmFlexedCm: 31, leftArmFlexedCm: 31,
              rightThighProximalCm: 64, leftThighProximalCm: 63,
              rightCalfCm: 39, leftCalfCm: 39
            },
            skinfolds: {
              tricepsMm: 24,
              bicepsMm: 12,
              subscapularMm: 22,
              chestMm: 15,
              midaxillaryMm: 19,
              suprailiacMm: 28,
              abdominalMm: 31,
              midThighMm: 29,
              calfMm: 18
            },
            bioimpedance: {
              weightKg: 74.5,
              bmi: 27.4,
              bodyFatPercentage: 33.1,
              skeletalMusclePercentage: 24.8,
              restingMetabolismKcal: 1390,
              bodyAge: 42,
              visceralFatLevel: 11
            },
            results: {
              bmi: 27.4,
              bmiClassification: 'Sobrepeso',
              bodyFatPercentage: 30.6,
              fatMassKg: 22.8,
              leanMassKg: 51.7,
              bodyFatClassification: 'Alto',
              visceralRisk: 'HIGH'
            }
          },
          {
            id: 'as_4',
            date: '2026-05-15',
            circumferences: {
              neckCm: 31.5,
              shoulderCm: 96,
              chestCm: 90,
              waistCm: 71,
              abdomenCm: 79,
              hipCm: 101,
              rightArmRelaxedCm: 27, leftArmRelaxedCm: 26.5,
              rightArmFlexedCm: 28.5, leftArmFlexedCm: 28,
              rightThighProximalCm: 59, leftThighProximalCm: 58,
              rightCalfCm: 37, leftCalfCm: 37
            },
            skinfolds: {
              tricepsMm: 19,
              bicepsMm: 9,
              subscapularMm: 16,
              chestMm: 10,
              midaxillaryMm: 14,
              suprailiacMm: 21,
              abdominalMm: 23,
              midThighMm: 22,
              calfMm: 14
            },
            bioimpedance: {
              weightKg: 68.2,
              bmi: 25.1,
              bodyFatPercentage: 27.8,
              skeletalMusclePercentage: 27.5,
              restingMetabolismKcal: 1430,
              bodyAge: 35,
              visceralFatLevel: 8
            },
            results: {
              bmi: 25.1,
              bmiClassification: 'Sobrepeso (Limítrofe)',
              bodyFatPercentage: 25.2,
              fatMassKg: 17.2,
              leanMassKg: 51.0,
              bodyFatClassification: 'Normal',
              visceralRisk: 'NORMAL'
            }
          }
        ]
      }
    ]
  };
}

function loadDatabase() {
  try {
    if (!existsSync(dbFilePath)) {
      const mockDb = getInitialMockDatabase();
      writeFileSync(dbFilePath, JSON.stringify(mockDb, null, 2), 'utf-8');
      return mockDb;
    }
    const content = readFileSync(dbFilePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading database, returning mock:', error);
    return getInitialMockDatabase();
  }
}

function saveDatabase(data: any) {
  try {
    writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

function getAge(birthDateString: string): number {
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function runAssessmentMath(student: Student, payload: any) {
  const age = getAge(student.birthDate);
  const weight = Number(payload.bioimpedance.weightKg || student.heightCm - 100);
  const height = student.heightCm;

  const bmi = parseFloat((weight / ((height / 100) ** 2)).toFixed(1));
  let bmiClassification = 'Normal';
  if (bmi < 18.5) bmiClassification = 'Abaixo do peso';
  else if (bmi < 25) bmiClassification = 'Normal';
  else if (bmi < 30) bmiClassification = 'Sobrepeso';
  else if (bmi < 35) bmiClassification = 'Obesidade Grau I';
  else if (bmi < 40) bmiClassification = 'Obesidade Grau II';
  else bmiClassification = 'Obesidade Grau III';

  const skinfolds = payload.skinfolds || {};
  const sum7 = (Number(skinfolds.tricepsMm) || 0) +
               (Number(skinfolds.subscapularMm) || 0) +
               (Number(skinfolds.chestMm) || 0) +
               (Number(skinfolds.midaxillaryMm) || 0) +
               (Number(skinfolds.suprailiacMm) || 0) +
               (Number(skinfolds.abdominalMm) || 0) +
               (Number(skinfolds.midThighMm) || 0);

  let bodyFat = 0;
  let db = 0;

  if (sum7 > 0) {
    if (student.gender === 'MALE') {
      db = 1.112 - (0.00043499 * sum7) + (0.00000055 * sum7 * sum7) - (0.00028826 * age);
    } else {
      db = 1.097 - (0.00046971 * sum7) + (0.00000056 * sum7 * sum7) - (0.00012828 * age);
    }
    if (db > 0) {
      bodyFat = (4.95 / db - 4.50) * 100;
    }
  } else {
    if (student.gender === 'MALE') {
      const sum3 = (Number(skinfolds.chestMm) || 0) + (Number(skinfolds.abdominalMm) || 0) + (Number(skinfolds.midThighMm) || 0);
      if (sum3 > 0) {
        db = 1.10938 - (0.0008267 * sum3) + (0.0000016 * sum3 * sum3) - (0.0002574 * age);
        bodyFat = (4.95 / db - 4.50) * 100;
      }
    } else {
      const sum3 = (Number(skinfolds.tricepsMm) || 0) + (Number(skinfolds.suprailiacMm) || 0) + (Number(skinfolds.midThighMm) || 0);
      if (sum3 > 0) {
        db = 1.0994921 - (0.0009929 * sum3) + (0.0000023 * sum3 * sum3) - (0.0001392 * age);
        bodyFat = (4.95 / db - 4.50) * 100;
      }
    }
  }

  let finalBodyFat = bodyFat;
  if (!finalBodyFat || finalBodyFat <= 2) {
    finalBodyFat = Number(payload.bioimpedance.bodyFatPercentage) || 15;
  }

  finalBodyFat = parseFloat(finalBodyFat.toFixed(1));

  let bodyFatClassification = 'Normal';
  if (student.gender === 'MALE') {
    if (finalBodyFat < 8) bodyFatClassification = 'Excelente (Atleta)';
    else if (finalBodyFat < 15) bodyFatClassification = 'Bom';
    else if (finalBodyFat < 20) bodyFatClassification = 'Normal';
    else if (finalBodyFat < 25) bodyFatClassification = 'Alto';
    else bodyFatClassification = 'Muito Alto';
  } else {
    if (finalBodyFat < 15) bodyFatClassification = 'Excelente (Atleta)';
    else if (finalBodyFat < 23) bodyFatClassification = 'Bom';
    else if (finalBodyFat < 30) bodyFatClassification = 'Normal';
    else if (finalBodyFat < 35) bodyFatClassification = 'Alto';
    else bodyFatClassification = 'Muito Alto';
  }

  const fatMassKg = parseFloat((weight * (finalBodyFat / 100)).toFixed(1));
  const leanMassKg = parseFloat((weight - fatMassKg).toFixed(1));

  const visceral = Number(payload.bioimpedance.visceralFatLevel || 0);
  let visceralRisk: 'NORMAL' | 'HIGH' | 'VERY_HIGH' = 'NORMAL';
  if (visceral >= 15) {
    visceralRisk = 'VERY_HIGH';
  } else if (visceral >= 10) {
    visceralRisk = 'HIGH';
  }

  return {
    bmi,
    bmiClassification,
    bodyFatPercentage: finalBodyFat,
    fatMassKg,
    leanMassKg,
    bodyFatClassification,
    visceralRisk
  };
}

// ---------------- REST API Endpoints ---------------- //

app.get('/api/students', (req, res) => {
  const db = loadDatabase();
  const summaryList = db.students.map((std: Student) => {
    const lastAssessment = std.assessments.length > 0 
      ? std.assessments[std.assessments.length - 1] 
      : null;
    return {
      id: std.id,
      name: std.name,
      birthDate: std.birthDate,
      gender: std.gender,
      heightCm: std.heightCm,
      goal: std.goal,
      phoneNumber: std.phoneNumber,
      lgpdConsentStatus: std.lgpdConsentStatus,
      lastAssessmentDate: lastAssessment ? lastAssessment.date : null,
      lastWeight: lastAssessment ? lastAssessment.bioimpedance.weightKg : null,
      lastFatPercentage: lastAssessment ? lastAssessment.results.bodyFatPercentage : null
    };
  });
  res.json(summaryList);
});

app.get('/api/dashboard/stats', (req, res) => {
  const db = loadDatabase();
  const totalStudents = db.students.length;
  
  let totalAssessments = 0;
  let visceralAlerts = 0;
  let sumWeightDiff = 0;
  let countWithDiff = 0;

  db.students.forEach((std: any) => {
    if (std.assessments.length >= 1) {
      totalAssessments += std.assessments.length;
      const latest = std.assessments[std.assessments.length - 1];
      if (latest.bioimpedance.visceralFatLevel >= 10) {
        visceralAlerts++;
      }
      if (std.assessments.length >= 2) {
        const earliest = std.assessments[0];
        const latestWeight = latest.bioimpedance.weightKg;
        const earliestWeight = earliest.bioimpedance.weightKg;
        sumWeightDiff += (earliestWeight - latestWeight);
        countWithDiff++;
      }
    }
  });

  const avgWeightLost = countWithDiff > 0 ? parseFloat((sumWeightDiff / countWithDiff).toFixed(1)) : 0;

  res.json({
    activeStudents: totalStudents,
    totalAssessments,
    visceralAlerts,
    avgWeightLost,
    totalRevenueMonthly: totalStudents * 450,
    todayWorkoutsCount: Math.ceil(totalStudents * 0.6),
    dailyAgenda: [
      { id: '1', time: '07:00', studentName: 'Carlos Silva', focus: 'Inferiores (Foco Quadríceps)' },
      { id: '2', time: '08:30', studentName: 'Maria Santos', focus: 'Cardio + Core Reabilitação' },
      { id: '3', time: '17:30', studentName: 'Camila de Oliveira', focus: 'Superiores RML' },
      { id: '4', time: '19:00', studentName: 'Carlos Silva (Treino Livre)', focus: 'Avaliação Periódica' }
    ]
  });
});

app.get('/api/students/:id', (req, res) => {
  const db = loadDatabase();
  const student = db.students.find((s: Student) => s.id === req.params.id);
  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }
  res.json(student);
});

app.post('/api/students', (req, res) => {
  const db = loadDatabase();
  const { name, birthDate, gender, heightCm, goal, phoneNumber, lgpdConsentStatus, anamnesis } = req.body;

  if (!name || !birthDate || !gender || !heightCm) {
    res.status(400).json({ error: 'Faltam dados obrigatórios do aluno.' });
    return;
  }

  const newStudent: Student = {
    id: 'std_' + Math.random().toString(36).substring(2, 11),
    name,
    birthDate,
    gender,
    heightCm: Number(heightCm),
    goal: goal || 'A definir',
    phoneNumber: phoneNumber || '',
    lgpdConsentStatus: lgpdConsentStatus || 'PENDING',
    anamnesis: anamnesis || {
      cardiacCondition: false,
      jointPain: false,
      chestPainDuringExercise: false,
      recentSurgeryDescription: '',
      activeMedications: '',
      notes: ''
    },
    assessments: [],
    photos: []
  };

  db.students.push(newStudent);
  saveDatabase(db);
  res.status(201).json(newStudent);
});

app.delete('/api/students/:id', (req, res) => {
  const db = loadDatabase();
  const studentIndex = db.students.findIndex((s: Student) => s.id === req.params.id);
  
  if (studentIndex === -1) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }

  db.students.splice(studentIndex, 1);
  saveDatabase(db);
  res.json({ success: true, message: 'Aluno removido com sucesso.' });
});

app.post('/api/students/:id/assessments', (req, res) => {
  const db = loadDatabase();
  const student = db.students.find((s: Student) => s.id === req.params.id);
  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }

  const { date, circumferences, skinfolds, bioimpedance } = req.body;

  if (!date || !circumferences || !skinfolds || !bioimpedance) {
    res.status(400).json({ error: 'Dados de avaliação incompletos.' });
    return;
  }

  const results = runAssessmentMath(student, { circumferences, skinfolds, bioimpedance });

  const newAssessment = {
    id: 'as_' + Math.random().toString(36).substring(2, 11),
    date,
    circumferences,
    skinfolds,
    bioimpedance,
    results
  };

  student.assessments.push(newAssessment);
  student.assessments.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  saveDatabase(db);
  res.status(201).json(newAssessment);
});

app.delete('/api/students/:id/assessments/:assessmentId', (req, res) => {
  const db = loadDatabase();
  const student = db.students.find((s: Student) => s.id === req.params.id);
  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }

  const index = student.assessments.findIndex((a: any) => a.id === req.params.assessmentId);
  if (index === -1) {
    res.status(404).json({ error: 'Assessment not found' });
    return;
  }

  student.assessments.splice(index, 1);
  saveDatabase(db);
  res.json({ success: true, message: 'Avaliação removida com sucesso.' });
});

app.post('/api/students/:id/photos', (req, res) => {
  const db = loadDatabase();
  const student = db.students.find((s: Student) => s.id === req.params.id);
  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }

  const { date, category, image } = req.body;
  if (!image) {
    res.status(400).json({ error: 'Nenhuma imagem recebida.' });
    return;
  }

  const newPhoto = {
    id: 'photo_' + Math.random().toString(36).substring(2, 11),
    date: date || new Date().toISOString().substring(0, 10),
    category: category || 'FRENTE',
    image
  };

  student.photos.push(newPhoto);
  saveDatabase(db);
  res.status(201).json(newPhoto);
});

app.delete('/api/students/:id/photos/:photoId', (req, res) => {
  const db = loadDatabase();
  const student = db.students.find((s: Student) => s.id === req.params.id);
  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }

  const index = student.photos.findIndex((p: any) => p.id === req.params.photoId);
  if (index === -1) {
    res.status(404).json({ error: 'Photo not found' });
    return;
  }

  student.photos.splice(index, 1);
  saveDatabase(db);
  res.json({ success: true });
});

// ---------------------------------------------------- //

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
