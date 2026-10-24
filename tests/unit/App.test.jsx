import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import App from '../../src/App';
import { ThemeProvider } from '../../src/hooks/useTheme';

// Mock the database initialization so it resolves immediately in tests
vi.mock('../../src/db/database', () => ({
  initDB: vi.fn().mockResolvedValue(true)
}));

describe('App Foundation', () => {
  it('renders the app layout after database initialization', async () => {
    // Wrap App in ThemeProvider to provide context to the Sidebar
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );
    
    // Use waitFor to handle the async state update from useEffect
    await waitFor(() => {
      // Look for the new Dashboard title rendered by default on the index route
      const heading = screen.getByText(/Dashboard Overview/i);
      expect(heading).toBeInTheDocument();
    });
  });
});