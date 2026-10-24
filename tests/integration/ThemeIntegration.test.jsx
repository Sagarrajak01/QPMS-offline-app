import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import MainLayout from '../../src/layouts/MainLayout.jsx';
import { ThemeProvider } from '../../src/hooks/useTheme.jsx';

describe('Theme Integration & UI Rendering', () => {
  beforeEach(() => {
    // Clear localStorage and document class before each test
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to light mode and toggles to dark mode when the button is clicked', async () => {
    render(
      <BrowserRouter>
        <ThemeProvider>
          <MainLayout />
        </ThemeProvider>
      </BrowserRouter>
    );

    // Initial state: Light mode
    const toggleButton = screen.getByText('Dark Mode');
    expect(toggleButton).toBeInTheDocument();
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Action: Click toggle
    fireEvent.click(toggleButton);

    // Assertion: Should switch to Dark Mode
    await waitFor(() => {
      expect(screen.getByText('Light Mode')).toBeInTheDocument();
    });
    
    // Verify DOM and LocalStorage updates
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('theme')).toBe('dark');
  });

  it('initializes correctly if dark mode was previously saved in localStorage', () => {
    // Pre-set localStorage
    window.localStorage.setItem('theme', 'dark');

    render(
      <BrowserRouter>
        <ThemeProvider>
          <MainLayout />
        </ThemeProvider>
      </BrowserRouter>
    );

    // Assertion: Should render in Dark Mode instantly based on context initialization
    expect(screen.getByText('Light Mode')).toBeInTheDocument();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});