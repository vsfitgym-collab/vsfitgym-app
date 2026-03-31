const BASE_URL = 'https://exercisedb.dev/api/v1';
// ─── Instruction Translations (Dicionário Completo) ────────────────────────────
const instructionTranslations: Record<string, string> = {
  // Posição/Setup
  'lie flat on a bench': 'deite-se horizontalmente no banco',
  'lie flat on your back on a bench': 'deite-se de costas no banco',
  'stand with feet hip-width apart': 'fique em pé com os pés na largura do quadril',
  'stand with feet shoulder-width apart': 'fique em pé com os pés na largura dos ombros',
  'sit on the machine': 'sente-se na máquina',
  'sit on a bench': 'sente-se em um banco',
  'grab the bar': 'pegue na barra',
  'grip the bar': 'agarre a barra',
  'hold the weight': 'segure o peso',
  
  // Movimentos
  'press the weight forward': 'empurre o peso para frente',
  'push the weight up': 'empurre o peso para cima',
  'pull the weight towards you': 'puxe o peso em sua direção',
  'lower the weight': 'abaixe o peso',
  'raise the weight': 'levante o peso',
  'squeeze your muscles': 'aperte seus músculos',
  'bend your elbows': 'dobre seus cotovelos',
  'straighten your arms': 'estique seus braços',
  'bend your knees': 'dobre seus joelhos',
  'keep your back straight': 'mantenha suas costas retas',
  'keep your core tight': 'mantenha seu core contraído',
  
  // Respiração
  'breathe in': 'inspire',
  'breathe out': 'expire',
  'exhale as you': 'expire enquanto',
  'inhale as you': 'inspire enquanto',
  
  // Repetição
  'repeat for reps': 'repita pelo número de repetições',
  'perform the movement': 'execute o movimento',
  'do this for the prescribed number of reps': 'faça pelo número prescrito de repetições',
};

// Função para traduzir uma instrução individual
function translateInstruction(instruction: string): string {
  const lower = instruction.toLowerCase();
  
  // Procura match direto
  if (instructionTranslations[lower]) {
    return instructionTranslations[lower];
  }
  
  // Procura por substring (se contém a chave)
  for (const [key, value] of Object.entries(instructionTranslations)) {
    if (lower.includes(key)) {
      return instruction.replace(new RegExp(key, 'gi'), value);
    }
  }
  
  // Se não encontrou, retorna a instrução original
  return instruction;
}

// Função síncrona para traduzir array de instruções
export function translateInstructionsSync(instructions: string[]): string[] {
  return instructions.map(i => translateInstruction(i));
}

// Nova função de normalização completa
export function normalizeExerciseData(exercise: ExerciseDBItem): ExerciseDBItem {
  return {
    ...exercise,
    name: translateExerciseName(exercise.name),
    targetMuscles: exercise.targetMuscles.map(m => translateMuscle(m)),
    bodyParts: exercise.bodyParts.map(b => translateBodyPart(b)),
    equipments: exercise.equipments.map(e => translateEquipment(e)),
    secondaryMuscles: exercise.secondaryMuscles.map(m => translateMuscle(m)),
    instructions: translateInstructionsSync(exercise.instructions) // ← Síncrono!
  };
}

export interface ExerciseDBItem {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

export interface ExerciseDBResponse {
  success: boolean;
  metadata: {
    totalExercises: number;
    totalPages: number;
    currentPage: number;
    previousPage: string | null;
    nextPage: string | null;
  };
  data: ExerciseDBItem[];
}

export async function fetchExercises(params: {
  offset?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
}): Promise<ExerciseDBResponse> {
  const url = new URL(`${BASE_URL}/exercises`);
  if (params.offset !== undefined) url.searchParams.set('offset', String(params.offset));
  if (params.limit !== undefined) url.searchParams.set('limit', String(params.limit));
  if (params.search) url.searchParams.set('search', params.search);
  if (params.sortBy) url.searchParams.set('sortBy', params.sortBy);
  url.searchParams.set('sortOrder', 'asc');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`ExerciseDB API error: ${res.status}`);
  return res.json();
}

export async function fetchExercisesByBodyPart(
  bodyPart: string,
  offset = 0,
  limit = 25
): Promise<ExerciseDBResponse> {
  const url = new URL(`${BASE_URL}/bodyparts/${encodeURIComponent(bodyPart)}/exercises`);
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`ExerciseDB API error: ${res.status}`);
  return res.json();
}

export async function fetchBodyParts(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/bodyparts`);
  if (!res.ok) throw new Error(`ExerciseDB API error: ${res.status}`);
  const json: { success: boolean; data: { name: string }[] } = await res.json();
  return json.data.map((d) => d.name);
}

// ─── Body Part Translations ───────────────────────────────────────────────────
export const bodyPartTranslations: Record<string, string> = {
  back: 'Costas',
  cardio: 'Cardio',
  chest: 'Peito',
  'lower arms': 'Antebraço',
  'lower legs': 'Panturrilha',
  neck: 'Pescoço',
  shoulders: 'Ombros',
  'upper arms': 'Braços',
  'upper legs': 'Coxa',
  waist: 'Abdômen',
};

export function translateBodyPart(name: string): string {
  return bodyPartTranslations[name.toLowerCase()] ?? capitalize(name);
}

// ─── Muscle Translations ──────────────────────────────────────────────────────
const muscleTranslations: Record<string, string> = {
  // Core
  abdominals: 'Abdominais',
  abs: 'Abdominais',
  obliques: 'Oblíquos',
  'serratus anterior': 'Serrátil Anterior',
  // Back
  lats: 'Latíssimo do Dorso',
  'upper back': 'Parte Superior das Costas',
  'lower back': 'Lombar',
  traps: 'Trapézio',
  rhomboids: 'Romboides',
  // Chest
  pectorals: 'Peitoral',
  'upper chest': 'Peitoral Superior',
  'lower chest': 'Peitoral Inferior',
  // Shoulders
  delts: 'Deltóide',
  'front delts': 'Deltóide Frontal',
  'rear delts': 'Deltóide Posterior',
  'lateral delts': 'Deltóide Lateral',
  'anterior deltoid': 'Deltóide Anterior',
  'posterior deltoid': 'Deltóide Posterior',
  // Arms
  biceps: 'Bíceps',
  'biceps brachii': 'Bíceps Braquial',
  triceps: 'Tríceps',
  'triceps brachii': 'Tríceps Braquial',
  forearms: 'Antebraço',
  brachialis: 'Braquial',
  brachioradialis: 'Braquiorradial',
  // Legs
  quads: 'Quadríceps',
  quadriceps: 'Quadríceps',
  hamstrings: 'Isquiotibiais',
  glutes: 'Glúteos',
  'gluteus maximus': 'Glúteo Máximo',
  'gluteus medius': 'Glúteo Médio',
  calves: 'Panturrilha',
  'gastrocnemius': 'Gastrocnêmio',
  soleus: 'Sóleo',
  adductors: 'Adutores',
  abductors: 'Abdutores',
  'hip flexors': 'Flexores do Quadril',
  'hip abductors': 'Abdutores do Quadril',
  'hip adductors': 'Adutores do Quadril',
  // Others
  'spine': 'Coluna',
  'erector spinae': 'Eretor da Coluna',
  'rotator cuff': 'Manguito Rotador',
  'infraspinatus': 'Infraespinal',
  'supraspinatus': 'Supraespinal',
  'teres major': 'Redondo Maior',
  'teres minor': 'Redondo Menor',
  'subscapularis': 'Subescapular',
  'levator scapulae': 'Elevador da Escápula',
  'cardiovascular system': 'Sistema Cardiovascular',
  'iliopsoas': 'Iliopsoas',
  'tibialis anterior': 'Tibial Anterior',
  'rectus femoris': 'Reto Femoral',
  'vastus lateralis': 'Vasto Lateral',
  'vastus medialis': 'Vasto Medial',
  'biceps femoris': 'Bíceps Femoral',
  'semitendinosus': 'Semitendíneo',
  'semimembranosus': 'Semimembranoso',
  'gracilis': 'Grácil',
  'sartorius': 'Sartório',
  'pectineus': 'Pectíneo',
  'peroneals': 'Fibulares',
  'wrist flexors': 'Flexores do Punho',
  'wrist extensors': 'Extensores do Punho',
};

export function translateMuscle(name: string): string {
  return muscleTranslations[name.toLowerCase()] ?? capitalize(name);
}

// ─── Equipment Translations ───────────────────────────────────────────────────
const equipmentTranslations: Record<string, string> = {
  barbell: 'Barra',
  dumbbell: 'Halter',
  'ez barbell': 'Barra W',
  'cable': 'Cabo / Polia',
  machine: 'Máquina',
  'smith machine': 'Máquina Smith',
  'leverage machine': 'Máquina de Alavanca',
  'assisted': 'Máquina Assistida',
  'resistance band': 'Elástico',
  band: 'Elástico',
  kettlebell: 'Kettlebell',
  'body weight': 'Peso Corporal',
  bodyweight: 'Peso Corporal',
  'pull-up bar': 'Barra Fixa',
  'pull up bar': 'Barra Fixa',
  'chin-up bar': 'Barra Fixa',
  'stability ball': 'Bola de Equilíbrio',
  'medicine ball': 'Bola Medicinal',
  'bosu ball': 'Bosu',
  'foam roll': 'Rolo de Espuma',
  'rope': 'Corda',
  'tire': 'Pneu',
  'sled': 'Trenó',
  'trap bar': 'Barra Hexagonal',
  roller: 'Rolo',
  'suspension': 'Suspensão (TRX)',
  'bench': 'Banco',
  'olympic barbell': 'Barra Olímpica',
  'swiss ball': 'Bola Suíça',
  'ab wheel': 'Roda Abdominal',
  'upper body ergometer': 'Ergômetro de Braços',
  'skierg': 'SkiErg',
  'stepmill machine': 'Escada Rolante',
  'elliptical machine': 'Elíptico',
  'stationary bike': 'Bicicleta Ergométrica',
  'rowing machine': 'Remo Ergométrico',
  'treadmill': 'Esteira',
  'hammer': 'Martelo',
  'parallel bars': 'Barras Paralelas',
  'dip bar': 'Barras para Mergulho',
  'rings': 'Argolas',
};

export function translateEquipment(name: string): string {
  return equipmentTranslations[name.toLowerCase()] ?? capitalize(name);
}

// ─── Exercise Name Translations ───────────────────────────────────────────────
const exerciseNameTranslations: Record<string, string> = {
  // Peito
  'bench press': 'Supino',
  'barbell bench press': 'Supino com Barra',
  'dumbbell bench press': 'Supino com Halter',
  'incline bench press': 'Supino Inclinado',
  'incline barbell bench press': 'Supino Inclinado com Barra',
  'incline dumbbell bench press': 'Supino Inclinado com Halter',
  'decline bench press': 'Supino Declinado',
  'decline barbell bench press': 'Supino Declinado com Barra',
  'decline dumbbell bench press': 'Supino Declinado com Halter',
  'push-up': 'Flexão de Braço',
  'push up': 'Flexão de Braço',
  'wide push-up': 'Flexão Aberta',
  'diamond push-up': 'Flexão Diamante',
  'dip': 'Mergulho',
  'chest dip': 'Mergulho no Peito',
  'chest fly': 'Crucifixo',
  'dumbbell fly': 'Crucifixo com Halter',
  'dumbbell chest fly': 'Crucifixo com Halter',
  'cable fly': 'Crucifixo no Cabo',
  'cable chest fly': 'Crucifixo no Cabo',
  'pec deck': 'Peck Deck',
  'chest press': 'Pressão no Peito',
  'machine chest press': 'Pressão no Peito na Máquina',
  'cable crossover': 'Cross Cable',
  'low cable crossover': 'Cross Cable Baixo',
  'high cable crossover': 'Cross Cable Alto',
  'chest pullover': 'Pullover no Peito',
  // Costas
  'pull-up': 'Barra Fixa',
  'pull up': 'Barra Fixa',
  'chin-up': 'Pegada Supinada na Barra',
  'lat pulldown': 'Puxada na Polia Alta',
  'seated cable row': 'Remada Sentado no Cabo',
  'bent over row': 'Remada Curvada',
  'barbell row': 'Remada com Barra',
  'barbell bent over row': 'Remada Curvada com Barra',
  'dumbbell row': 'Remada com Halter',
  'one arm dumbbell row': 'Remada Unilateral com Halter',
  't-bar row': 'Remada T',
  'seated row': 'Remada Sentado',
  'cable row': 'Remada no Cabo',
  'face pull': 'Face Pull',
  'deadlift': 'Levantamento Terra',
  'romanian deadlift': 'Levantamento Terra Romeno',
  'straight leg deadlift': 'Levantamento Terra Pernas Retas',
  'rack pull': 'Rack Pull',
  'good morning': 'Good Morning',
  'hyperextension': 'Hiperextensão',
  'back extension': 'Extensão de Costas',
  'pullover': 'Pullover',
  'dumbbell pullover': 'Pullover com Halter',
  'shrug': 'Encolhimento de Ombros',
  'barbell shrug': 'Encolhimento com Barra',
  'dumbbell shrug': 'Encolhimento com Halter',
  // Ombros
  'shoulder press': 'Desenvolvimento',
  'overhead press': 'Desenvolvimento',
  'military press': 'Desenvolvimento Militar',
  'barbell overhead press': 'Desenvolvimento com Barra',
  'dumbbell shoulder press': 'Desenvolvimento com Halter',
  'arnold press': 'Arnold Press',
  'lateral raise': 'Elevação Lateral',
  'dumbbell lateral raise': 'Elevação Lateral com Halter',
  'cable lateral raise': 'Elevação Lateral no Cabo',
  'front raise': 'Elevação Frontal',
  'dumbbell front raise': 'Elevação Frontal com Halter',
  'cable front raise': 'Elevação Frontal no Cabo',
  'rear delt fly': 'Crucifixo Invertido',
  'reverse fly': 'Crucifixo Invertido',
  'rear delt raise': 'Elevação Posterior',
  'upright row': 'Remada Alta',
  'barbell upright row': 'Remada Alta com Barra',
  'dumbbell upright row': 'Remada Alta com Halter',
  // Bíceps
  'bicep curl': 'Rosca Direta',
  'biceps curl': 'Rosca Direta',
  'barbell curl': 'Rosca Direta com Barra',
  'dumbbell curl': 'Rosca Direta com Halter',
  'hammer curl': 'Rosca Martelo',
  'concentration curl': 'Rosca Concentrada',
  'preacher curl': 'Rosca Scott',
  'cable curl': 'Rosca no Cabo',
  'incline dumbbell curl': 'Rosca Inclinada com Halter',
  'ez bar curl': 'Rosca com Barra W',
  'reverse curl': 'Rosca Inversa',
  'cable hammer curl': 'Rosca Martelo no Cabo',
  // Tríceps
  'tricep extension': 'Extensão de Tríceps',
  'triceps extension': 'Extensão de Tríceps',
  'overhead tricep extension': 'Extensão de Tríceps Acima da Cabeça',
  'tricep pushdown': 'Puxada de Tríceps',
  'triceps pushdown': 'Puxada de Tríceps',
  'cable tricep pushdown': 'Puxada de Tríceps no Cabo',
  'skull crusher': 'Testa com Barra (Skull Crusher)',
  'close grip bench press': 'Supino Pegada Fechada',
  'tricep dip': 'Mergulho no Tríceps',
  'triceps dip': 'Mergulho no Tríceps',
  'diamond push up': 'Flexão Diamante',
  'overhead dumbbell extension': 'Extensão com Halter Acima da Cabeça',
  // Quadríceps
  'squat': 'Agachamento',
  'barbell squat': 'Agachamento com Barra',
  'dumbbell squat': 'Agachamento com Halter',
  'front squat': 'Agachamento Frontal',
  'goblet squat': 'Agachamento Goblet',
  'hack squat': 'Agachamento Hack',
  'leg press': 'Leg Press',
  'leg extension': 'Extensão de Perna',
  'lunge': 'Avanço',
  'walking lunge': 'Avanço Caminhando',
  'dumbbell lunge': 'Avanço com Halter',
  'barbell lunge': 'Avanço com Barra',
  'step up': 'Step Up',
  'box squat': 'Agachamento na Caixa',
  'bulgarian split squat': 'Agachamento Búlgaro',
  'wall sit': 'Cadeira na Parede',
  'sissy squat': 'Agachamento Sissy',
  // Isquiotibiais
  'leg curl': 'Flexão de Perna',
  'lying leg curl': 'Flexão de Perna Deitado',
  'seated leg curl': 'Flexão de Perna Sentado',
  'standing leg curl': 'Flexão de Perna em Pé',
  'deadlift (romanian)': 'Levantamento Terra Romeno',
  'glute ham raise': 'Glute Ham Raise',
  'nordic curl': 'Nordic Curl',
  // Glúteos
  'hip thrust': 'Elevação de Quadril',
  'barbell hip thrust': 'Elevação de Quadril com Barra',
  'glute bridge': 'Ponte de Glúteo',
  'cable kickback': 'Chute no Cabo',
  'donkey kick': 'Coice de Burro',
  'sumo squat': 'Agachamento Sumô',
  'sumo deadlift': 'Levantamento Terra Sumô',
  'fire hydrant': 'Hidrant',
  // Panturrilha
  'calf raise': 'Elevação de Panturrilha',
  'standing calf raise': 'Elevação de Panturrilha em Pé',
  'seated calf raise': 'Elevação de Panturrilha Sentado',
  'donkey calf raise': 'Elevação de Panturrilha Inclinado',
  // Abdômen
  'crunch': 'Abdominal',
  'sit up': 'Sit Up',
  'sit-up': 'Sit Up',
  'plank': 'Prancha',
  'side plank': 'Prancha Lateral',
  'leg raise': 'Elevação de Pernas',
  'hanging leg raise': 'Elevação de Pernas Suspenso',
  'bicycle crunch': 'Abdominal Bicicleta',
  'russian twist': 'Torção Russa',
  'mountain climber': 'Escalada',
  'ab wheel rollout': 'Roda Abdominal',
  'cable crunch': 'Abdominal no Cabo',
  'v-up': 'Abdominal em V',
  'flutter kick': 'Pedalada Deitada',
  // Cardio
  'jump rope': 'Pular Corda',
  'burpee': 'Burpee',
  'jumping jack': 'Polichinelo',
  'high knees': 'Corrida Parada (Joelhos Altos)',
  'box jump': 'Salto na Caixa',
  'running': 'Corrida',
  'treadmill running': 'Corrida na Esteira',
  'cycling': 'Ciclismo',
  'rowing': 'Remo',
};

export function translateExerciseName(name: string): string {
  const lower = name.toLowerCase().trim();
  if (exerciseNameTranslations[lower]) return exerciseNameTranslations[lower];
  // Try partial matches for compound names
  for (const [key, value] of Object.entries(exerciseNameTranslations)) {
    if (lower.includes(key) && key.length > 5) return value;
  }
  return formatExerciseName(name);
}

// ─── Instruction Translation Cache ───────────────────────────────────────────
const translationCache = new Map<string, string>();

export async function translateTextToPt(text: string): Promise<string> {
  if (!text) return text;
  if (translationCache.has(text)) return translationCache.get(text)!;

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|pt-br`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Translation failed');
    const data = await res.json();
    const translated: string = data?.responseData?.translatedText ?? text;
    translationCache.set(text, translated);
    return translated;
  } catch {
    return text;
  }
}

export async function translateInstructions(instructions: string[]): Promise<string[]> {
  return Promise.all(instructions.map((step) => translateTextToPt(step)));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function capitalize(str: string): string {
  return str
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatExerciseName(name: string): string {
  return capitalize(name);
}
