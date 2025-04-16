import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { useState, useEffect } from 'react';
import './rich-text-editor.css';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder = 'Inizia a scrivere qui...' }: RichTextEditorProps) {
  const [editorData, setEditorData] = useState(content);
  const [charCount, setCharCount] = useState(0);
  
  useEffect(() => {
    // Aggiorna il conteggio caratteri (approssimativo, escludendo i tag HTML)
    const tempElement = document.createElement('div');
    tempElement.innerHTML = editorData;
    const textContent = tempElement.textContent || '';
    setCharCount(textContent.length);
  }, [editorData]);
  
  const handleChange = (_event: any, editor: any) => {
    const data = editor.getData();
    setEditorData(data);
    onChange(data);
  };

  return (
    <div className="rich-text-editor border rounded-md">
      <CKEditor
        editor={ClassicEditor}
        data={content}
        config={{
          placeholder: placeholder,
          toolbar: [
            'heading', '|',
            'bold', 'italic', 'underline', 'strikethrough', '|',
            'bulletedList', 'numberedList', '|',
            'blockQuote', 'link', '|',
            'undo', 'redo'
          ],
          heading: {
            options: [
              { model: 'paragraph', title: 'Paragrafo', class: 'ck-heading_paragraph' },
              { model: 'heading2', view: 'h2', title: 'Titolo', class: 'ck-heading_heading2' }
            ]
          },
          language: 'it'
        }}
        onChange={handleChange}
      />
      
      {/* Contatore caratteri in basso a destra */}
      <div className="text-xs text-muted-foreground text-right px-3 py-1 border-t bg-muted/20">
        {charCount} caratteri
      </div>
    </div>
  );
}