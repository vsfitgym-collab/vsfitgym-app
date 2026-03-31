# 🔧 Correção: Associação de Treinos Premium aos Planos

## 📋 O Problema

Quando você criava um treino e o associava a um **plano premium**, o treino não estava sendo vinculado aos alunos com aquele plano ativo.

### Root Cause

O banco de dados estava **desatualizado**. O schema SQL original não tinha:

1. ✗ Tabela `plans` (planos/assinaturas)
2. ✗ Tabela `subscriptions` (associação aluno ↔ plano)
3. ✗ Coluna `plan_id` na tabela `workouts`
4. ✗ Coluna `is_premium` na tabela `workouts`

O código React/TypeScript **tentava salvar** com essas colunas, mas o INSERT falhava silenciosamente porque elas não existiam.

---

## ✅ Solução: Migração do Banco de Dados

### Passo 1: Acessar o Supabase SQL Editor

1. Abra sua dashboard do Supabase: https://app.supabase.io
2. Selecione seu projeto **VSFit Gym**
3. Clique em **SQL Editor** (lado esquerdo)
4. Clique em **New Query**

### Passo 2: Copiar e Executar a Migração

1. Abra o arquivo: `supabase_migration_fix_plans.sql`
2. Copie TODO o conteúdo
3. Cole no editor SQL do Supabase`
4. Clique em **RUN** (ou `Ctrl+Enter`)

### Passo 3: Validar a Migração

Você deve ver 3 mensagens de sucesso no console (sem erros em vermelho):

```
✓ CREATE TABLE plans
✓ CREATE TABLE subscriptions
✓ ALTER TABLE workouts
✓ CREATE POLICY (múltiplas vezes)
✓ CREATE INDEX
```

---

## 🔄 Como Funciona Agora

### Fluxo Correto: Treino → Plano → Alunos

```
1. PersonalTrainer cria um PLANO (ex: "Plano VIP 3 Meses - R$299")
   └─ Salva em: plans table

2. PersonalTrainer cria um TREINO e atribui ao PLANO
   └─ Salva em: workouts (com plan_id + is_premium=true)

3. Aluno COMPRA o plano (PIX/Mercado Pago)
   └─ Cria registro em: subscriptions (student_id → plan_id, status='active')

4. Aluno ACESSA seus treinos
   ├─ Treinos pessoais (student_id = auth.user_id) ✓
   └─ Treinos premium (is_premium=true + subscription.status='active') ✓ NOVO!
```

---

## 🧪 Testando a Correção

### Como um Personal Trainer:

1. Vá para **Gestão de Planos** (`/plans`)
2. Crie um novo plano (ex: "Plano Elite - R$500")
3. Abra o plano e clique em **+ Novo** (para adicionar treino)
4. Crie um treino premium associado ao plano

### Como um Aluno:

1. Vá para **Escolha seu Plano** (`/subscriptions`)
2. Selecione o plano e clique em **Subscrever**
3. Complete o pagamento (teste com PIX)
4. Vá para **Meus Treinos** (`/workout-view`)
5. ✅ O treino premium deve aparecer agora!

---

## 📊 Estrutura do Banco Atualizada

### Plans Table

| Campo           | Tipo    | Descrição           |
| --------------- | ------- | ------------------- |
| id              | UUID    | Chave primária      |
| personal_id     | UUID    | Quem criou o plano  |
| name            | TEXT    | Nome do plano       |
| price           | NUMERIC | Preço em R$         |
| duration_months | INT     | Duração em meses    |
| duration_days   | INT     | Duração em dias     |
| is_featured     | BOOLEAN | Destaque na página  |
| features        | JSONB   | Array de benefícios |

### Subscriptions Table

| Campo      | Tipo      | Descrição                      |
| ---------- | --------- | ------------------------------ |
| id         | UUID      | Chave primária                 |
| student_id | UUID      | Aluno que assinou              |
| plan_id    | UUID      | Plano que assinou              |
| status     | TEXT      | 'active', 'expired', 'pending' |
| start_date | TIMESTAMP | Quando começou                 |
| end_date   | TIMESTAMP | Quando termina                 |

### Workouts Table (Atualizado)

| Campo NOVO | Tipo    | Descrição            |
| ---------- | ------- | -------------------- |
| plan_id    | UUID    | Associação ao plano  |
| is_premium | BOOLEAN | É um treino premium? |

---

## 🔐 Segurança: RLS Policies Implementadas

✅ **Personals** podem criar/editar planos próprios  
✅ **Alunos** veem apenas treinos do seu personal + treinos premium ativos  
✅ **Pública** vê apenas planos marcados como "destaque"  
✅ **Controle de acesso automático** por subscription.status

---

## 🚨 Próximos Passos

Após aplicar a migração:

1. **Verificar PlansManagement.tsx** - Deve funcionar igual
2. **Verificar WorkoutEditor.tsx** - Agora salva `plan_id` + `is_premium` corretamente
3. **Verificar usePlanAccess hook** - Deve buscar treinos premium

Se encontrar erros, verifique:

- [ ] Migração foi executada sem erros
- [ ] Supabase mostrou as tabelas em **Database** → **Tables**
- [ ] Row Level Security está ativado (🔒 ícone nas tabelas)

---

## 📝 Rollback (se necessário)

Se algo der errado, você pode desfazer a migração. Execute no Supabase SQL:

```sql
-- CUIDADO: Isso vai deletar planos, subscriptions e as colunas novas
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS plans;
ALTER TABLE workouts DROP COLUMN IF EXISTS plan_id;
ALTER TABLE workouts DROP COLUMN IF EXISTS is_premium;
```

**Nota:** Backup seus dados antes de fazer rollback!
