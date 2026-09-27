"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import Shell from './Shell';
import { api } from '../lib';

export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  step?: string;
  options?: { value: string; label: string }[];
};

export type Column = {
  key: string;
  label: string;
};

function get(obj: any, path: string) {
  return path.split('.').reduce((value, key) => value?.[key], obj) ?? '—';
}

function textValue(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function CrudPage({
  title,
  subtitle,
  endpoint,
  columns,
  fields,
  extra,
}: {
  title: string;
  subtitle: string;
  endpoint: string;
  columns: Column[];
  fields: Field[];
  extra?: ReactNode;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState(columns[0]?.key || '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function load() {
    setLoading(true);
    try {
      setRows(await api(endpoint));
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [endpoint]);

  useEffect(() => {
    setPage(1);
  }, [query, sortKey, sortDir]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api(endpoint, { method: 'POST', body: JSON.stringify(form) });
      setForm({});
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr');
    const filtered = normalized
      ? rows.filter((row) =>
          columns.some((column) =>
            textValue(get(row, column.key)).toLocaleLowerCase('fr').includes(normalized),
          ),
        )
      : [...rows];

    if (!sortKey) return filtered;

    return filtered.sort((a, b) => {
      const av = textValue(get(a, sortKey));
      const bv = textValue(get(b, sortKey));
      return av.localeCompare(bv, 'fr', { numeric: true, sensitivity: 'base' }) *
        (sortDir === 'asc' ? 1 : -1);
    });
  }, [rows, query, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((value) => (value === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function exportCsv() {
    const escape = (value: unknown) => {
      const text = textValue(value).replaceAll('"', '""');
      return `"${text}"`;
    };
    const header = columns.map((column) => escape(column.label)).join(',');
    const body = filteredRows
      .map((row) => columns.map((column) => escape(get(row, column.key))).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + '\n' + body], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/gi, '-') || 'export'}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <div className="muted">{subtitle}</div>
        </div>
      </div>

      {extra}

      <div className="panel">
        <h2>Ajouter</h2>
        <form className="form-grid" onSubmit={submit}>
          {fields.map((field) => (
            <div className="field" key={field.name}>
              <label>{field.label}</label>
              {field.options ? (
                <select
                  required={field.required}
                  value={form[field.name] || ''}
                  onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                >
                  <option value="">Sélectionner</option>
                  {field.options.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  required={field.required}
                  step={field.step}
                  type={field.type || 'text'}
                  value={form[field.name] || ''}
                  onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                />
              )}
            </div>
          ))}
          <div className="form-actions">
            <button className="btn btn-primary">Enregistrer</button>
          </div>
        </form>
        {error && <div className="error">{error}</div>}
      </div>

      <div className="panel">
        <div className="list-toolbar">
          <div>
            <h2>Liste</h2>
            <div className="muted list-count">
              {filteredRows.length} résultat{filteredRows.length > 1 ? 's' : ''}
            </div>
          </div>
          <div className="list-actions">
            <input
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
            />
            <button className="btn btn-secondary" type="button" onClick={exportCsv} disabled={!filteredRows.length}>
              Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty">Chargement…</div>
        ) : filteredRows.length === 0 ? (
          <div className="empty">Aucune donnée correspondant aux critères.</div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key}>
                        <button className="sort-button" type="button" onClick={() => toggleSort(column.key)}>
                          {column.label}
                          {sortKey === column.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, index) => (
                    <tr key={row.id || index}>
                      {columns.map((column) => (
                        <td key={column.key}>{String(get(row, column.key))}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                Précédent
              </button>
              <span>
                Page {page} / {totalPages}
              </span>
              <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
                Suivant
              </button>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
