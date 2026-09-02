import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Database, FolderOpen, Table2, Columns } from 'lucide-react'
import { fetchProjects, fetchDatasets, fetchTables, fetchSchema } from '../api'
import type { Column, BQTable, Dataset, Project } from '../types'

interface SidebarProps {
  onInsertText: (text: string) => void
}

const chevronStyle = (open: boolean): React.CSSProperties => ({
  transition: 'transform 0.15s',
  transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
  flexShrink: 0,
  cursor: 'pointer',
})

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 6px',
  cursor: 'pointer',
  borderRadius: 3,
  userSelect: 'none',
  position: 'relative',
}

function AddButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        marginLeft: 'auto',
        padding: '1px 6px',
        fontSize: 10,
        background: '#0e639c',
        border: 'none',
        borderRadius: 3,
        color: '#fff',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      + add
    </button>
  )
}

// ─── Column rows ────────────────────────────────────────────────────────────

function ColumnRow({ col, onInsertText }: { col: Column; onInsertText: (t: string) => void }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      style={{ ...rowStyle, paddingLeft: 52, background: hover ? '#2a2d2e' : 'transparent' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Columns size={13} color="#858585" style={{ flexShrink: 0 }} />
      <span style={{ color: '#9cdcfe', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {col.name}
      </span>
      <span style={{ color: '#6a6a6a', fontSize: 10, marginRight: 4 }}>{col.type}</span>
      {hover && <AddButton onClick={(e) => { e.stopPropagation(); onInsertText(col.name) }} />}
    </div>
  )
}

function ColumnList({
  project, dataset, table, onInsertText,
}: {
  project: string; dataset: string; table: string; onInsertText: (t: string) => void
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['schema', project, dataset, table],
    queryFn: () => fetchSchema(project, dataset, table),
  })
  if (isLoading) return <div style={{ paddingLeft: 52, color: '#858585', fontSize: 12 }}>Loading…</div>
  if (error) return <div style={{ paddingLeft: 52, color: '#f44747', fontSize: 12 }}>{String(error)}</div>
  return (
    <>
      {(data ?? []).map((col) => (
        <ColumnRow key={col.name} col={col} onInsertText={onInsertText} />
      ))}
    </>
  )
}

// ─── Table rows ─────────────────────────────────────────────────────────────

function TableRow({
  table, onInsertText,
}: {
  table: BQTable; onInsertText: (t: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const fqn = `\`${table.project}.${table.dataset}.${table.id}\``

  return (
    <>
      <div
        style={{ ...rowStyle, paddingLeft: 36, background: hover ? '#2a2d2e' : 'transparent' }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronRight size={13} color="#858585" style={chevronStyle(open)} />
        <Table2 size={13} color="#c5a5c5" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {table.id}
        </span>
        {hover && (
          <AddButton
            onClick={(e) => {
              e.stopPropagation()
              onInsertText(fqn)
            }}
          />
        )}
      </div>
      {open && (
        <ColumnList
          project={table.project}
          dataset={table.dataset}
          table={table.id}
          onInsertText={onInsertText}
        />
      )}
    </>
  )
}

function TableList({
  project, dataset, onInsertText,
}: {
  project: string; dataset: string; onInsertText: (t: string) => void
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tables', project, dataset],
    queryFn: () => fetchTables(project, dataset),
  })
  if (isLoading) return <div style={{ paddingLeft: 36, color: '#858585', fontSize: 12 }}>Loading…</div>
  if (error) return <div style={{ paddingLeft: 36, color: '#f44747', fontSize: 12 }}>{String(error)}</div>
  return (
    <>
      {(data ?? []).map((t) => (
        <TableRow key={t.id} table={t} onInsertText={onInsertText} />
      ))}
    </>
  )
}

// ─── Dataset rows ────────────────────────────────────────────────────────────

function DatasetRow({
  ds, onInsertText,
}: {
  ds: Dataset; onInsertText: (t: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)

  return (
    <>
      <div
        style={{ ...rowStyle, paddingLeft: 20, background: hover ? '#2a2d2e' : 'transparent' }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronRight size={13} color="#858585" style={chevronStyle(open)} />
        <Database size={13} color="#4fc3f7" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ds.id}
        </span>
      </div>
      {open && <TableList project={ds.project} dataset={ds.id} onInsertText={onInsertText} />}
    </>
  )
}

function DatasetList({ project, onInsertText }: { project: string; onInsertText: (t: string) => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['datasets', project],
    queryFn: () => fetchDatasets(project),
  })
  if (isLoading) return <div style={{ paddingLeft: 20, color: '#858585', fontSize: 12 }}>Loading…</div>
  if (error) return <div style={{ paddingLeft: 20, color: '#f44747', fontSize: 12 }}>{String(error)}</div>
  if (!data?.length) return <div style={{ paddingLeft: 20, color: '#858585', fontSize: 12 }}>No datasets</div>
  return (
    <>
      {data.map((ds) => (
        <DatasetRow key={ds.id} ds={ds} onInsertText={onInsertText} />
      ))}
    </>
  )
}

// ─── Project rows ─────────────────────────────────────────────────────────────

function ProjectRow({ project, onInsertText }: { project: Project; onInsertText: (t: string) => void }) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)

  return (
    <>
      <div
        style={{ ...rowStyle, paddingLeft: 4, background: hover ? '#2a2d2e' : 'transparent' }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronRight size={14} color="#858585" style={chevronStyle(open)} />
        <FolderOpen size={14} color="#e2c08d" style={{ flexShrink: 0 }} />
        <span
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 600,
            color: '#e2c08d',
          }}
        >
          {project.displayName}
        </span>
      </div>
      {open && <DatasetList project={project.id} onInsertText={onInsertText} />}
    </>
  )
}

// ─── Root Sidebar ─────────────────────────────────────────────────────────────

export default function Sidebar({ onInsertText }: SidebarProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  })

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        background: '#252526',
        borderRight: '1px solid #3c3c3c',
        padding: '8px 4px',
      }}
    >
      <div
        style={{
          padding: '4px 8px 8px',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#858585',
        }}
      >
        Projects
      </div>

      {isLoading && <div style={{ padding: '4px 8px', color: '#858585' }}>Loading projects…</div>}
      {error && (
        <div style={{ padding: '4px 8px', color: '#f44747', fontSize: 12 }}>{String(error)}</div>
      )}
      {data?.map((p) => (
        <ProjectRow key={p.id} project={p} onInsertText={onInsertText} />
      ))}
    </div>
  )
}
