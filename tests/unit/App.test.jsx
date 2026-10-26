import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../../src/App';
import { ThemeProvider } from '../../src/hooks/useTheme';
import { initDB } from '../../src/db/database';

// Mock the database initialization so it resolves immediately in tests
vi.mock('../../src/db/database', () => ({
  initDB: vi.fn().mockResolvedValue(true)
}));

const renderApp = () =>
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );

describe('App Foundation', () => {
  beforeEach(() => {
    initDB.mockReset();
    initDB.mockResolvedValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('shows a loading state until the database is ready, then the app', async () => {
    let resolveInit;
    initDB.mockReturnValue(new Promise((resolve) => { resolveInit = resolve; }));

    renderApp();

    expect(screen.getByRole('status')).toHaveTextContent(/Loading UI/i);
    expect(screen.queryByText(/Dashboard Overview/i)).not.toBeInTheDocument();

    resolveInit(true);

    expect(await screen.findByText(/Dashboard Overview/i)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  describe('when the database cannot be opened', () => {
    it('shows the real reason and does not render any page', async () => {
      initDB.mockRejectedValue(new Error('Local storage is only available in the Android app.'));

      renderApp();

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Storage unavailable');
      expect(alert).toHaveTextContent('Local storage is only available in the Android app.');
      expect(screen.queryByText(/Dashboard Overview/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('falls back to a generic message when the error has none', async () => {
      initDB.mockRejectedValue(undefined);

      renderApp();

      expect(await screen.findByRole('alert')).toHaveTextContent('The local database could not be opened.');
    });

    it('lets the user retry and opens the app once initialization succeeds', async () => {
      initDB.mockRejectedValueOnce(new Error('Failed to initialize the local database: disk full'));

      renderApp();

      expect(await screen.findByRole('alert')).toHaveTextContent('disk full');

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      expect(await screen.findByText(/Dashboard Overview/i)).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(initDB).toHaveBeenCalledTimes(2);
    });

    it('keeps showing the error if the retry fails too', async () => {
      initDB.mockRejectedValueOnce(new Error('first failure')).mockRejectedValueOnce(new Error('second failure'));

      renderApp();
      await screen.findByText(/first failure/);

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      expect(await screen.findByText(/second failure/)).toBeInTheDocument();
      expect(screen.queryByText(/first failure/)).not.toBeInTheDocument();
    });
  });

  it('shows a not-found page with a way back for unknown routes', async () => {
    window.history.pushState({}, '', '/does-not-exist');

    renderApp();

    expect(await screen.findByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to dashboard/i })).toHaveAttribute('href', '/');
    expect(screen.queryByText(/Under Construction/i)).not.toBeInTheDocument();
  });

  it('does not update state after being unmounted mid-initialization', async () => {
    let resolveInit;
    initDB.mockReturnValue(new Promise((resolve) => { resolveInit = resolve; }));

    const { unmount } = renderApp();
    unmount();
    resolveInit(true);

    await Promise.resolve();
    expect(console.error).not.toHaveBeenCalled();
  });
});