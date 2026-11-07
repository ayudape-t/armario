import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import App from './App';

test('la app muestra las 4 pestañas en el armario', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  for (const nombre of ['Armario', 'Outfit', 'Plan', 'Cuenta']) {
    expect(screen.getByRole('link', { name: nombre })).toBeTruthy();
  }
});
