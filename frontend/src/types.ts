export interface Project {
  id: string
  displayName: string
}

export interface Dataset {
  id: string
  project: string
}

export interface BQTable {
  id: string
  project: string
  dataset: string
  tableType: string
}

export interface Column {
  name: string
  type: string
  mode: string
  description: string
}

export interface QueryResult {
  columns: string[]
  rows: (string | null)[][]
  totalRows: number
  jobId: string
}
