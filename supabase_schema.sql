-- VSFit Gym Supabase Schema

-- 1. Profiles Table
CREATE TABLE profiles (
  uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('personal', 'student')),
  personal_id UUID REFERENCES profiles(uid),
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Exercises Table
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id UUID REFERENCES profiles(uid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  video_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Workouts Table
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(uid) ON DELETE CASCADE,
  personal_id UUID REFERENCES profiles(uid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exercises JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Evolution Table
CREATE TABLE evolution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(uid) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC(5,2),
  measurements JSONB DEFAULT '{}',
  photos JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Messages Table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(uid) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(uid) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

-- Profiles: Users can read their own profile and personals can read their students' profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = uid);

CREATE POLICY "Personals can view their students" 
ON profiles FOR SELECT 
USING (auth.uid() = personal_id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = uid);

-- Exercises: Personals can manage their own exercises, students can view their personal's exercises
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personals can manage their exercises" 
ON exercises FOR ALL 
USING (auth.uid() = personal_id);

CREATE POLICY "Students can view their personal's exercises" 
ON exercises FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.uid = auth.uid() AND profiles.personal_id = exercises.personal_id
));

-- Workouts: Personals can manage workouts for their students, students can view their own
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personals can manage workouts" 
ON workouts FOR ALL 
USING (auth.uid() = personal_id);

CREATE POLICY "Students can view their workouts" 
ON workouts FOR SELECT 
USING (auth.uid() = student_id);

-- Evolution: Students can manage their own, personals can view their students'
ALTER TABLE evolution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage their evolution" 
ON evolution FOR ALL 
USING (auth.uid() = student_id);

CREATE POLICY "Personals can view student evolution" 
ON evolution FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.uid = evolution.student_id AND profiles.personal_id = auth.uid()
));

-- Messages: Users can only see messages they sent or received
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their messages" 
ON messages FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" 
ON messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);
