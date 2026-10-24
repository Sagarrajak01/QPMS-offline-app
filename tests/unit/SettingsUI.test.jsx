import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import Settings from '../../src/pages/Settings';

vi.mock('../../src/services/backupService.js', () => ({
  exportData: vi.fn().mockResolvedValue('{"version":1}'),
  importData: vi.fn()
}));

describe('Settings UI', () => {
  it('renders the settings page with backup options', () => {
    render(<Settings />);
    expect(screen.getByText('Settings & Data Management')).toBeInTheDocument();
    expect(screen.getByText('Backup Database')).toBeInTheDocument();
    expect(screen.getByText('Restore Database')).toBeInTheDocument();
  });
});