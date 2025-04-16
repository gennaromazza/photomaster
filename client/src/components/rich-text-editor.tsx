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
        editor={ClassicEditor as any}
        data={content}
        config={{
          placeholder: placeholder,
          toolbar: {
            items: [
              'heading', '|',
              'bold', 'italic', '|',
              'bulletedList', 'numberedList', '|',
              'blockQuote', 'link', '|',
              'undo', 'redo'
            ],
            shouldNotGroupWhenFull: true
          },
          heading: {
            options: [
              { model: 'paragraph', title: 'Paragrafo', class: 'ck-heading_paragraph' },
              { model: 'heading2', view: 'h2', title: 'Titolo', class: 'ck-heading_heading2' }
            ]
          },
          link: {
            decorators: {
              openInNewTab: {
                mode: 'manual',
                label: 'Apri in una nuova scheda',
                defaultValue: true
              }
            }
          },
          language: 'it'
        }}
        onChange={handleChange}
      />
      
      {/* Contatore caratteri in basso a destra */}
      <div className="char-counter">
        {charCount} caratteri
      </div>
    </div>
  );
}