import type { QueryResult } from '../types'

interface ResultsTableProps {
  result: QueryResult | null
  isLoading: boolean
  error: string | null
}

export default function ResultsTable({ result, isLoading, error }: ResultsTableProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e1e1e' }}>
      {/* Status bar */}
      <div
        style={{
          padding: '4px 12px',
          background: '#252526',
          borderTop: '1px solid #3c3c3c',
          fontSize: 12,
          color: '#858585',
          display: 'flex',
          gap: 16,
          flexShrink: 0,
        }}
      >
        {result && (
          <>
            <span>{result.rows.length} rows returned</span>
            {result.totalRows > result.rows.length && (
              <span style={{ color: '#f5a623' }}>
                (limited to {result.rows.length} of {result.totalRows} total)
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontFamily: 'monospace' }}>Job: {result.jobId}</span>
          </>
        )}
        {isLoading && <span style={{ color: '#4fc3f7' }}>Running query…</span>}
        {!result && !isLoading && !error && <span>No results yet</span>}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(30,30,30,0.8)',
              zIndex: 10,
            }}
          >
            <span style={{ color: '#4fc3f7' }}>Loading…</span>
          </div>
        )}

        {error && (
          <div
            style={{
              margin: 12,
              padding: '10px 14px',
              background: '#5a1d1d',
              border: '1px solid #f44747',
              borderRadius: 4,
              color: '#f44747',
              fontFamily: 'monospace',
              fontSize: 12,
              whiteSpace: 'pre-wrap',
            }}
          >
            {error}
          </div>
        )}

        {result && !error && (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                {result.columns.map((col) => (
                  <th
                    key={col}
                    style={{
                      position: 'sticky',
                      top: 0,
                      background: '#252526',
                      padding: '6px 12px',
                      textAlign: 'left',
                      borderBottom: '1px solid #3c3c3c',
                      color: '#9cdcfe',
                      whiteSpace: 'nowrap',
                      fontWeight: 600,
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, ri) => (
                <tr
                  key={ri}
                  style={{ background: ri % 2 === 0 ? '#1e1e1e' : '#252526' }}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: '4px 12px',
                        borderBottom: '1px solid #2d2d2d',
                        color: cell === null ? '#6a6a6a' : '#d4d4d4',
                        whiteSpace: 'nowrap',
                        maxWidth: 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {cell === null ? 'NULL' : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
