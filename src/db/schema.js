export const TABLES = {
  SUBJECTS: 'subjects',
  QUESTIONS: 'questions',
  PAPERS: 'papers',
  APP_SETTINGS: 'app_settings',
};

const initialSchema = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  executed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  default_duration INTEGER,
  default_marks INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  unit TEXT,
  topic TEXT,
  type TEXT NOT NULL, /* MCQ, SHORT, LONG, DESCRIPTIVE */
  difficulty TEXT NOT NULL, /* EASY, MEDIUM, HARD */
  marks INTEGER NOT NULL,
  text TEXT NOT NULL,
  options TEXT, /* JSON array for MCQs */
  correct_answer TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS papers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  examination_name TEXT,
  subject_id TEXT NOT NULL,
  duration INTEGER NOT NULL,
  max_marks INTEGER NOT NULL,
  instructions TEXT,
  institution_name TEXT,
  snapshot TEXT NOT NULL, /* JSON representation of the entire paper */
  is_draft INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(subject_id) REFERENCES subjects(id)
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

export const MIGRATIONS = [
  {
    version: 1,
    statement: initialSchema
  }
];