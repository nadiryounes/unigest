import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CrudPage from './CrudPage';

const apiMock = vi.fn();

vi.mock('../lib', () => ({
  api: (...args: any[]) => apiMock(...args),
}));

vi.mock('./Shell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const rows = Array.from({ length: 12 }, (_, index) => ({
  id: String(index + 1),
  studentNumber: `ETU-${String(index + 1).padStart(3, '0')}`,
  lastName: index === 10 ? 'Zidane' : `Nom ${index + 1}`,
  firstName: `Prénom ${index + 1}`,
}));

describe('CrudPage generic list behavior', () => {
  beforeEach(() => {
    apiMock.mockReset();
    apiMock.mockResolvedValue(rows);
  });

  it('searches across displayed columns', async () => {
    render(
      <CrudPage
        title="Étudiants"
        subtitle="Test"
        endpoint="/students"
        fields={[]}
        columns={[
          { key: 'studentNumber', label: 'Matricule' },
          { key: 'lastName', label: 'Nom' },
        ]}
      />,
    );

    await screen.findByText('ETU-001');
    fireEvent.change(screen.getByPlaceholderText('Rechercher…'), {
      target: { value: 'Zidane' },
    });

    expect(screen.getByText('Zidane')).toBeInTheDocument();
    expect(screen.queryByText('ETU-001')).not.toBeInTheDocument();
    expect(screen.getByText('1 résultat')).toBeInTheDocument();
  });

  it('paginates and sorts the result set', async () => {
    render(
      <CrudPage
        title="Étudiants"
        subtitle="Test"
        endpoint="/students"
        fields={[]}
        columns={[
          { key: 'studentNumber', label: 'Matricule' },
          { key: 'lastName', label: 'Nom' },
        ]}
      />,
    );

    await screen.findByText('ETU-001');
    expect(screen.getByText('Page 1 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText('ETU-011')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Matricule/ }));

    await waitFor(() => {
      const body = screen.getByRole('table').querySelector('tbody');
      expect(body).not.toBeNull();
      const firstRow = within(body as HTMLElement).getAllByRole('row')[0];
      expect(within(firstRow).getByText('ETU-012')).toBeInTheDocument();
    });
  });
});
