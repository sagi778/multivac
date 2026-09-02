import type { BQTable, Column, Dataset, Project, QueryResult } from './types'

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }
  return res.json()
}

export const fetchProjects = () => get<Project[]>('/api/projects')

export const fetchDatasets = (project: string) =>
  get<Dataset[]>(`/api/projects/${encodeURIComponent(project)}/datasets`)

export const fetchTables = (project: string, dataset: string) =>
  get<BQTable[]>(`/api/datasets/${encodeURIComponent(project)}/${encodeURIComponent(dataset)}/tables`)

export const fetchSchema = (project: string, dataset: string, table: string) =>
  get<Column[]>(
    `/api/tables/${encodeURIComponent(project)}/${encodeURIComponent(dataset)}/${encodeURIComponent(table)}/schema`,
  )

export async function runQuery(sql: string, project: string): Promise<QueryResult> {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, project }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }
  return res.json()
}
