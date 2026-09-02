import Editor, { OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'

interface SqlEditorProps {
  onMount: (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => void
  onRunQuery: (sql: string) => void
}

export default function SqlEditor({ onMount, onRunQuery }: SqlEditorProps) {
  const handleMount: OnMount = (editor, monaco) => {
    onMount(editor, monaco)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunQuery(editor.getValue())
    })
  }

  return (
    <Editor
      height="100%"
      defaultLanguage="sql"
      theme="vs-dark"
      defaultValue="-- Write your BigQuery SQL here\n-- Press Ctrl+Enter (Cmd+Enter on Mac) to run\n"
      onMount={handleMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        renderLineHighlight: 'line',
      }}
    />
  )
}
