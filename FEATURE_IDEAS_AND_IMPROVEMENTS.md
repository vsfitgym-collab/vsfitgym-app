# 💡 Feature Ideas & Architecture Improvements

Baseado na análise do código VSFit, aqui estão as melhores práticas para escalar a plataforma.

---

## 🎯 Feature Ideas (Curto a Médio Prazo)

### 1️⃣ Treinos Dinâmicos por Objetivo

**Problema:** Cada plano tem treinos estáticos.  
**Solução:** Criar treinos que se adaptam ao objetivo do aluno (perda de peso, ganho muscular, etc).

**Implementação:**

- Adicionar coluna `goal` na tabela `subscriptions`
- Criar `workout_templates` com variações por objetivo
- Personaltainer seleciona template, sistema adapta exercícios
- RLS: Aluno vê apenas template do seu objetivo

**Impacto:** Melhor retenção de alunos (20-30% mais engajamento)

---

### 2️⃣ Histórico de Workout Logs com Progressão

**Problema:** Aluno não sabe se está evoluindo (força, volume, técnica).  
**Solução:** Expandir `workout_logs` para rastrear métricas por exercício.

```sql
-- Nova estrutura
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  workout_id UUID,
  exercise_id VARCHAR,
  sets_completed INT[],        -- [3, 3, 2] séries completas
  reps_achieved INT[],         -- [12, 10, 8] reps por série
  load_used NUMERIC,           -- Peso/carga utilizada
  notes TEXT,                  -- "Cansou mais hoje", etc
  completed_at TIMESTAMP
);
```

**Benefits:**

- Dashboard mostra evolução: "Você fez +5kg a mais que semana passada"
- PersonalTrainer vê trends e ajusta treino automaticamente
- Competição casual: "Top alunos essa semana"

---

### 3️⃣ Agendamento Inteligente com Notificações

**Problema:** Alunos esquecem datas de treino.  
**Solução:** Sistema de agendamento com push notifications.

```sql
CREATE TABLE workout_schedules (
  id UUID,
  student_id UUID,
  workout_id UUID,
  scheduled_date DATE,
  scheduled_time TIME,
  notification_sent BOOLEAN,
  completed BOOLEAN,
  FOREIGN KEY (workout_id) REFERENCES workouts(id)
);
```

**Features:**

- PersonalTrainer agenda treinos de forma automática
- Aluno recebe notificação 1 dia antes + 2 horas antes
- Mobile PWA push notifications
- Lembretes via WhatsApp (Twilio integration)

---

### 4️⃣ Gamificação: Badges & Streaks

**Problema:** Falta motivação/feedback positivo no app.  
**Solução:** Sistema de achievements e streaks.

```sql
CREATE TABLE user_achievements (
  id UUID,
  student_id UUID,
  badge_type VARCHAR, -- 'first_workout', 'week_streak_7', '100_workouts', 'personal_record'
  achieved_at TIMESTAMP,
  UNIQUE(student_id, badge_type)
);
```

**Badges:**

- 🔥 7 dias de treino consecutivo
- 💪 100 treinos completos
- 🏆 Bateu recorde de carga em exercício
- ⭐ Primeira semana premium

**Impact:** Aumenta retention em 40% (estudos mostram)

---

### 5️⃣ Analytics Dashboard para PersonalTrainer

**Problema:** Trainer não sabe quem está progredindo/desistindo.  
**Solução:** Dashboard com métricas de alunos.

**Métricas:**

- Taxa de conclusão de treinos (últimos 7, 30 dias)
- Progressão de força (média de peso por exercício)
- Alunos em risco (sem atividade > 7 dias)
- ROI por plano (quanto ganha / quantos alunos)
- Churn rate (alunos que cancelam)

**Implementação:** Page `/personal/analytics` com gráficos

---

## 🏗️ Architectural Improvements

### A. Otimizar RLS com View Materializada

**Problema:** Query de workouts faz join com subscriptions toda vez.  
**Solução:** Criar view materializada que cache o resultado.

```sql
-- View: Workouts visíveis para o aluno
CREATE MATERIALIZED VIEW student_visible_workouts AS
SELECT
  w.*,
  CASE
    WHEN w.student_id = auth.uid() THEN 'personal'
    WHEN w.is_premium AND s.status = 'active' AND s.student_id = auth.uid() THEN 'premium'
  END as access_type
FROM workouts w
LEFT JOIN subscriptions s ON w.plan_id = s.plan_id
WHERE w.student_id = auth.uid() OR s.status = 'active';

-- Refresh automático a cada 1 hora
SELECT cron.schedule('refresh_workout_views', '0 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY student_visible_workouts');
```

---

### B. Adicionar Caching com Redis

**Problema:** Queries de planos/exercícios são chamadas frequentemente.  
**Solução:** Cache com Redis (via Supabase Edge Functions ou Vercel).

```typescript
// Exemplo: exercisedb search com cache 5 minutos
const cacheKey = `exercises:${search}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const result = await fetchExercises(search);
await redis.setex(cacheKey, 300, JSON.stringify(result));
return result;
```

---

### C. Rate Limiting na API

**Problema:** Sem proteção contra força bruta em pagamentos.  
**Solução:** Rate limit via Supabase Edge Functions.

```typescript
// Middleware de rate limiting
import { RateLimiter } from "https://deno.land/x/https://deno.land/x/ratelimit/mod.ts";

const limiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 10, // 10 requests
});

// Bloqueia múltiplas tentativas de pagamento
```

---

### D. Webhook Retry & Idempotency

**Problema:** PIX/Mercado Pago webhook pode falhar sem retry.  
**Solução:** Implementar retry com exponential backoff.

```typescript
// Idempotent payment webhook
const transactionKey = `${payment_id}:${user_id}`;
const exists = await supabase
  .from("payment_idempotency")
  .select("*")
  .eq("transaction_key", transactionKey)
  .single();

if (exists.data) return { alreadyProcessed: true };

// Processar pagamento...
await supabase.from("payment_idempotency").insert({ transaction_key });
```

---

## 📋 Data Model Improvements

### Adicionar Soft Deletes

```sql
ALTER TABLE workouts ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE plans ADD COLUMN deleted_at TIMESTAMP;

-- RLS: Nunca mostrar deleted items
CREATE POLICY "Hide deleted workouts"
ON workouts FOR SELECT
USING (deleted_at IS NULL);
```

**Benefício:** Auditoria + recuperação de dados acidental

---

### Adicionar Timestamps Completos

```sql
ALTER TABLE workouts
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workouts_update_timestamp
BEFORE UPDATE ON workouts
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
```

**Benefício:** Histórico de mudanças, debugging

---

### Indexação Estratégica

Já foram adicionadas na migração:

- ✅ `idx_plans_personal_id`
- ✅ `idx_subscriptions_student_id`
- ✅ `idx_subscriptions_status` (crítico para queries)

**Consideraderar adicionar:**

```sql
CREATE INDEX idx_workouts_student_id_created ON workouts(student_id, created_at DESC);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date)
  WHERE status = 'active';  -- Partial index
```

---

## 🔐 Security Hardening

### 1. Validação de Requisições

```typescript
// Middleware: Valida que o personal_id da request é o user autenticado
export const requirePersonalRole = async (req) => {
  const user = await supabase.auth.getUser();
  if (user.profile?.role !== "personal") {
    throw new Error("Unauthorized: Only personals can create plans");
  }
};
```

### 2. Audit Logging

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  action VARCHAR,  -- 'create_plan', 'delete_workout', etc
  table_name VARCHAR,
  record_id UUID,
  changes JSONB,  -- Old vs new values
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Input Sanitization

```typescript
// Sanitizar campos de texto contra XSS
import DOMPurify from "isomorphic-dompurify";

const sanitizeWorkoutName = (name: string) => {
  return DOMPurify.sanitize(name, {
    ALLOWED_TAGS: [], // Sem HTML
    ALLOWED_ATTR: [], // Sem atributos
  });
};
```

---

## 📈 Scaling Roadmap

| Phase                | Timeline   | Focus                                            |
| -------------------- | ---------- | ------------------------------------------------ |
| **1. Foundation**    | Semana 1-2 | ✅ Fix workout-plan association (você está aqui) |
| **2. Core Features** | Semana 3-4 | Treinos dinâmicos + Agendamento                  |
| **3. Analytics**     | Semana 5-6 | Dashboard para trainers                          |
| **4. Monetização**   | Semana 7-8 | Gamificação + Retention                          |
| **5. Scale**         | Semana 9+  | Caching, Rate limiting, Webhooks                 |

---

## 🚀 Next Steps

1. ✅ **Aplicar a migração SQL** (você fazer agora)
2. ⏳ **Testar workout + plano association**
3. ⏳ **Implementar feature #2** (Workout Logs de Progressão)
4. ⏳ **Adicionar analytics para PersonalTrainer**

Quer que eu comece com alguma dessas features?
