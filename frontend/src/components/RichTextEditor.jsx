import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'
import clsx from 'clsx'
import { Bold, Italic, List, ListOrdered } from 'lucide-react'

export default function RichTextEditor({ value, onChange, disabled, placeholder = 'Escribe aquí...' }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  // Sync disabled state
  useEffect(() => {
    if (editor) editor.setEditable(!disabled)
  }, [editor, disabled])

  // Sync value from outside (e.g. when data loads)
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const incoming = value || ''
    if (current !== incoming && (incoming === '' || incoming === '<p></p>') !== (current === '' || current === '<p></p>')) {
      editor.commands.setContent(incoming, false)
    }
  }, [value, editor])

  if (!editor) return null

  return (
    <div className={clsx(
      'rounded-lg border bg-white dark:bg-slate-700 transition-colors',
      disabled
        ? 'border-slate-200 dark:border-slate-600 opacity-60 cursor-not-allowed'
        : 'border-slate-200 dark:border-slate-600 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary'
    )}>
      {!disabled && (
        <div className="flex items-center gap-0.5 px-2 py-1 border-b border-slate-100 dark:border-slate-600">
          <ToolbarBtn
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Negrita"
          >
            <Bold className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Cursiva"
          >
            <Italic className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5" />
          <ToolbarBtn
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Lista"
          >
            <List className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Lista numerada"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolbarBtn>
        </div>
      )}
      <EditorContent
        editor={editor}
        className={clsx(
          'prose prose-xs dark:prose-invert max-w-none text-xs text-slate-800 dark:text-slate-100 px-3 py-2 min-h-[80px] focus:outline-none',
          disabled && 'pointer-events-none'
        )}
      />
    </div>
  )
}

function ToolbarBtn({ children, active, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={clsx(
        'p-1 rounded transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-slate-700 dark:hover:text-slate-200'
      )}
    >
      {children}
    </button>
  )
}
