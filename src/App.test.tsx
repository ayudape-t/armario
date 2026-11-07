import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import type { User } from '@supabase/supabase-js';
import App from './App';
import { SesionContext } from './lib/sesion';

test('la app muestra las 4 pestañas en el armario', () => {
  render(
    <SesionContext.Provider value={{ usuario: { id: 'u1' } as User, cargando: false }}>
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    </SesionContext.Provider>,
  );
  for (const nombre of ['Armario', 'Outfit', 'Plan', 'Cuenta']) {
    expect(screen.getByRole('link', { name: nombre })).toBeTruthy();
  }
});
