import { render, screen } from '@testing-library/react';
import App from './App';
import { describe, it, expect } from 'vitest';

describe('App', () => {
    it('renders heading', () => {
        render(<App />);
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument(); // Adjust based on actual App content
    });
});
