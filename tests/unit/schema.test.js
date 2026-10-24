import { describe, it, expect } from 'vitest';
import { TABLES, MIGRATIONS } from '../../src/db/schema';

describe('Database Schema', () => {
  it('defines the core tables correctly', () => {
    expect(TABLES).toHaveProperty('SUBJECTS');
    expect(TABLES).toHaveProperty('QUESTIONS');
    expect(TABLES).toHaveProperty('PAPERS');
    expect(TABLES).toHaveProperty('APP_SETTINGS');
  });

  it('contains the initial migration', () => {
    expect(MIGRATIONS.length).toBeGreaterThan(0);
    expect(MIGRATIONS[0].statement).toContain('CREATE TABLE IF NOT EXISTS subjects');
    expect(MIGRATIONS[0].statement).toContain('CREATE TABLE IF NOT EXISTS questions');
  });
});