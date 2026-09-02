import { useRef, useState } from 'react'
import type * as Monaco from 'monaco-editor'
import { Play } from 'lucide-react'
import Sidebar from './components/Sidebar'
import SqlEditor from './components/SqlEditor'
import ResultsTable from './components/ResultsTable'
import { runQuery } from './api'
import type { QueryResult } from './types'

export default function App() {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)

  const insertText = (text: string) => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return
    const selection = editor.getSelection()
    editor.executeEdits('bq-slave-insert', [
      {
        range: selection ?? new monaco.Range(1, 1, 1, 1),
        text,
        forceMoveMarkers: true,
      },
    ])
    editor.focus()
  }

  const handleRunQuery = async (sql: string) => {
    if (!sql.trim()) return
    setIsRunning(true)
    setQueryError(null)
    setQueryResult(null)
    try {
      const result = await runQuery(sql, '')
      setQueryResult(result)
    } catch (e) {
      setQueryError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsRunning(false)
    }
  }

  const handleRunClick = () => {
    const sql = editorRef.current?.getValue() ?? ''
    handleRunQuery(sql)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 280, flexShrink: 0 }}>
        <Sidebar onInsertText={insertText} />
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div
          style={{
            height: 40,
            background: '#2d2d2d',
            borderBottom: '1px solid #3c3c3c',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 700, color: '#e2c08d', fontSize: 14, marginRight: 8 }}>
            BQ Slave
          </span>
          <button
            onClick={handleRunClick}
            disabled={isRunning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 14px',
              background: isRunning ? '#555' : '#0e639c',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <Play size={13} />
            {isRunning ? 'Running…' : 'Run'}
          </button>
          <span style={{ marginLeft: 8, color: '#858585', fontSize: 11 }}>
            Ctrl+Enter to run
          </span>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <SqlEditor
            onMount={(editor, monaco) => { editorRef.current = editor; monacoRef.current = monaco }}
            onRunQuery={handleRunQuery}
          />
        </div>

        {/* Results */}
        <div style={{ height: '35%', flexShrink: 0, borderTop: '2px solid #3c3c3c' }}>
          <ResultsTable result={queryResult} isLoading={isRunning} error={queryError} />
        </div>
      </div>
    </div>
  )
}
