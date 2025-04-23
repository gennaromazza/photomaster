  const { photoId, sessionId } = insertPhotoSelectionSchema.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Verifica sessione
    const sessionRes = await client.query(
      `SELECT id, status 
       FROM selection_sessions 
       WHERE id = $1 FOR UPDATE`,
      [sessionId]
    );
    if (sessionRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    const { status } = sessionRes.rows[0];
    if (status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Sessione completata' });
    }

    // 2) Verifica foto
    const photoRes = await client.query(
      `SELECT id 
       FROM photos 
       WHERE id = $1`,
      [photoId]
    );
    if (photoRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Foto non trovata' });
    }

    // 3) Toggle selezione
    const existsRes = await client.query(
      `SELECT id 
       FROM photo_selections 
       WHERE photo_id = $1 AND session_id = $2`,
      [photoId, sessionId]
    );

    let action: 'added' | 'removed';
    if (existsRes.rowCount > 0) {
      await client.query(
        `DELETE FROM photo_selections 
         WHERE photo_id = $1 AND session_id = $2`,
        [photoId, sessionId]
      );
      action = 'removed';
    } else {
      // Controllo maxSelections
      const maxRes = await client.query(
        `SELECT max_selections 
         FROM gallery_selection_settings gss
         JOIN selection_sessions ss ON ss.gallery_id = gss.gallery_id
         WHERE ss.id = $1`,
        [sessionId]
      );
      const max = maxRes.rowCount ? maxRes.rows[0].max_selections : 0;
      if (max > 0) {
        const countRes = await client.query(
          `SELECT COUNT(*)::int AS cnt 
           FROM photo_selections 
           WHERE session_id = $1`,
          [sessionId]
        );
        if (countRes.rows[0].cnt >= max) {
          await client.query('ROLLBACK');
          return res.status(403).json({
            error: 'Numero massimo di selezioni raggiunto',
            max,
            current: countRes.rows[0].cnt
          });
        }
      }

      // INSERISCI con ON CONFLICT
      await client.query(
        `INSERT INTO photo_selections(photo_id, session_id, created_at)
         VALUES($1, $2, NOW())
         ON CONFLICT(photo_id, session_id) DO NOTHING`,
        [photoId, sessionId]
      );
      action = 'added';
    }

    await client.query('COMMIT');
    return res.status(200).json({ success: true, action, photoId, sessionId });

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error in togglePhotoSelection:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  } finally {
    client.release();
  }
};

export const getSessionSelections = async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);

    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'ID sessione non valido' });
    }

    // Verificare se la sessione esiste
    const sessionResult = await pool.query(
      'SELECT * FROM selection_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    // Ottieni tutte le selezioni con i dettagli delle foto
    const selectionsResult = await pool.query(
      `SELECT ps.*, p.filename, p.title, p.caption, p.chapter_id 
       FROM photo_selections ps
       JOIN photos p ON ps.photo_id = p.id
       WHERE ps.session_id = $1
       ORDER BY ps.created_at DESC`,
      [sessionId]
    );

    // Converti i nomi delle colonne da snake_case a camelCase
    const selections = selectionsResult.rows.map(row => ({
      id: row.id,
      photoId: row.photo_id,
      sessionId: row.session_id,
      createdAt: row.created_at,
      photo: {
        filename: row.filename,
        title: row.title,
        description: row.caption, // Usiamo il campo caption come description
        chapterId: row.chapter_id
      }
    }));

    res.status(200).json(selections);
  } catch (error: any) {
    console.error('Error in getSessionSelections:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getPhotoCommentsCount = async (req: Request, res: Response) => {
  try {
    const photoId = parseInt(req.params.photoId);

    if (isNaN(photoId)) {
      return res.status(400).json({ error: 'ID foto non valido' });
    }

    // Conta i commenti per questa foto
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM photo_comments WHERE photo_id = $1',
      [photoId]
    );

    res.status(200).json({ count: parseInt(countResult.rows[0].count) });
  } catch (error: any) {
    console.error('Error in getPhotoCommentsCount:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    // Validare i dati in ingresso
    const parseResult = insertPhotoCommentSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Dati non validi',
        details: parseResult.error.format()
      });
    }

    const { photoId, sessionId, content, userId, clientName } = parseResult.data;

    // Verificare se la foto esiste
    const photoResult = await pool.query(
      'SELECT id FROM photos WHERE id = $1',
      [photoId]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Foto non trovata' });
    }

    // Verificare se la sessione esiste e non è completata
    const sessionResult = await pool.query(
      'SELECT id, status, gallery_id FROM selection_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    const session = sessionResult.rows[0];

    if (session.status === 'completed') {
      return res.status(403).json({ error: 'La sessione è stata completata e non può essere modificata' });
    }

    // Verificare se i commenti sono abilitati per questa galleria
    const settingsResult = await pool.query(
      'SELECT allow_comments FROM gallery_selection_settings WHERE gallery_id = $1',
      [session.gallery_id]
    );

    const settings = settingsResult.rows.length > 0 ? settingsResult.rows[0] : null;

    if (settings && !settings.allow_comments) {
      return res.status(403).json({ error: 'I commenti non sono abilitati per questa galleria' });
    }

    // Aggiungere il commento
    const commentResult = await pool.query(
      `INSERT INTO photo_comments 
       (photo_id, session_id, content, user_id, client_name, is_read, name, email, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [photoId, sessionId, content, userId, clientName, false, clientName || 'Guest', 'no-reply@example.com', content || '']
    );

    // Converti i nomi delle colonne da snake_case a camelCase
    const comment = commentResult.rows[0];
    const result = {
      id: comment.id,
      photoId: comment.photo_id,
      sessionId: comment.session_id,
      content: comment.content,
      userId: comment.user_id,
      clientName: comment.client_name,
      isRead: comment.is_read,
      createdAt: comment.created_at
    };

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error in addComment:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const replyToComment = async (req: Request, res: Response) => {
  try {
    // Validare i dati in ingresso
    const schema = z.object({
      photoId: z.number(),
      sessionId: z.number(),
      content: z.string(),
      parentId: z.number(),
      userId: z.number().nullable().optional()
    });

    const parseResult = schema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Dati nonvalidi',
        details: parseResult.error.format()
      });
    }

    const { photoId, sessionId, content, parentId, userId } = parseResult.data;

    // Verificare se la foto esiste
    const photoResult = await pool.query(
      'SELECT id FROM photos WHERE id = $1',
      [photoId]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Foto non trovata' });
    }

    // Verificare se la sessione esiste e non è completata
    const sessionResult = await pool.query(
      'SELECT id, status, gallery_id FROM selection_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    const session = sessionResult.rows[0];

    if (session.status === 'completed') {
      return res.status(403).json({ error: 'La sessione è stata completata e non può essere modificata' });
    }

    // Verificare se il commento padre esiste
    const parentCommentResult = await pool.query(
      'SELECT id FROM photo_comments WHERE id = $1',
      [parentId]
    );

    if (parentCommentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Commento padre non trovato' });
    }

    // Ottieni l'username o altre informazioni dell'utente se disponibili
    let userInfo = null;
    if (userId) {
      const userResult = await pool.query(
        'SELECT username, full_name FROM users WHERE id = $1',
        [userId]
      );
      if (userResult.rows.length > 0) {
        userInfo = userResult.rows[0];
      }
    }

    // Aggiungere la risposta
    const commentResult = await pool.query(
      `INSERT INTO photo_comments 
       (photo_id, session_id, content, user_id, parent_id, is_read, name, email, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        photoId, 
        sessionId, 
        content, 
        userId, 
        parentId, 
        false, 
        userInfo ? userInfo.full_name || userInfo.username : 'Staff',
        'staff@example.com',
        content || ''
      ]
    );

    // Converti i nomi delle colonne da snake_case a camelCase
    const comment = commentResult.rows[0];
    const result = {
      id: comment.id,
      photoId: comment.photo_id,
      sessionId: comment.session_id,
      content: comment.content,
      userId: comment.user_id,
      parentId: comment.parent_id,
      isRead: comment.is_read,
      createdAt: comment.created_at
    };

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error in replyToComment:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getSessionComments = async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);

    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'ID sessione non valido' });
    }

    // Verificare se la sessione esiste
    const sessionResult = await pool.query(
      'SELECT * FROM selection_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    // Ottieni tutti i commenti per questa sessione
    const commentsResult = await pool.query(
      `SELECT pc.*, u.full_name as user_full_name, u.username as user_username
       FROM photo_comments pc
       LEFT JOIN users u ON pc.user_id = u.id
       WHERE pc.session_id = $1
       ORDER BY pc.created_at ASC`,
      [sessionId]
    );

    // Converti e organizza i commenti
    const comments = commentsResult.rows.map(row => ({
      id: row.id,
      photoId: row.photo_id,
      sessionId: row.session_id,
      content: row.content,
      userId: row.user_id,
      clientName: row.client_name,
      parentId: row.parent_id,
      isRead: row.is_read,
      createdAt: row.created_at,
      user: row.user_id ? {
        fullName: row.user_full_name,
        username: row.user_username
      } : null
    }));

    res.status(200).json(comments);
  } catch (error: any) {
    console.error('Error in getSessionComments:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getPhotoComments = async (req: Request, res: Response) => {
  try {
    const photoId = parseInt(req.params.photoId);

    if (isNaN(photoId)) {
      return res.status(400).json({ error: 'ID foto non valido' });
    }

    // Verificare se la foto esiste
    const photoResult = await pool.query(
      'SELECT id FROM photos WHERE id = $1',
      [photoId]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Foto non trovata' });
    }

    // Ottieni sessionId dai parametri query se disponibile
    const sessionId = req.query.sessionId ? parseInt(req.query.sessionId as string) : null;

    // Se sessionId è fornito, verificare se la sessione esiste
    if (sessionId) {
      const sessionResult = await pool.query(
        'SELECT * FROM selection_sessions WHERE id = $1',
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ error: 'Sessione non trovata' });
      }
    }

    // Costruire la query in base a se sessionId è fornito
    let commentsResult;
    if (sessionId) {
      commentsResult = await pool.query(
        `SELECT pc.*, u.full_name as user_full_name, u.username as user_username
         FROM photo_comments pc
         LEFT JOIN users u ON pc.user_id = u.id
         WHERE pc.photo_id = $1 AND pc.session_id = $2
         ORDER BY pc.created_at ASC`,
        [photoId, sessionId]
      );
    } else {
      commentsResult = await pool.query(
        `SELECT pc.*, u.full_name as user_full_name, u.username as user_username
         FROM photo_comments pc
         LEFT JOIN users u ON pc.user_id = u.id
         WHERE pc.photo_id = $1
         ORDER BY pc.created_at ASC`,
        [photoId]
      );
    }

    // Converti e organizza i commenti
    const comments = commentsResult.rows.map(row => ({
      id: row.id,
      photoId: row.photo_id,
      sessionId: row.session_id,
      content: row.content,
      userId: row.user_id,
      clientName: row.client_name,
      parentId: row.parent_id,
      isRead: row.is_read,
      createdAt: row.created_at,
      user: row.user_id ? {
        fullName: row.user_full_name,
        username: row.user_username
      } : null
    }));

    res.status(200).json(comments);
  } catch (error: any) {
    console.error('Error in getPhotoComments:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const markCommentAsRead = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID commento non valido' });
    }

    // Verificare se il commento esiste
    const commentResult = await pool.query(
      'SELECT * FROM photo_comments WHERE id = $1',
      [id]
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Commento non trovato' });
    }

    // Aggiornare il commento
    const updatedCommentResult = await pool.query(
      `UPDATE photo_comments 
       SET is_read = true
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Converti i nomi delle colonne da snake_case a camelCase
    const comment = updatedCommentResult.rows[0];
    const result = {
      id: comment.id,
      photoId: comment.photo_id,
      sessionId: comment.session_id,
      content: comment.content,
      userId: comment.user_id,
      clientName: comment.client_name,
      parentId: comment.parent_id,
      isRead: comment.is_read,
      createdAt: comment.created_at
    };

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in markCommentAsRead:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const exportSelections = async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);

    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'ID sessione non valido' });
    }

    // Verificare se la sessione esiste
    const sessionResult = await pool.query(
      'SELECT * FROM selection_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    const session = sessionResult.rows[0];

    // Ottieni tutte le selezioni con i dettagli delle foto
    const selectionsResult = await pool.query(
      `SELECT ps.id as selection_id, p.id as photo_id, p.filename, p.title, p.caption as description, p.chapter_id,
              g.name as gallery_name, g.description as gallery_description,
              gc.title as chapter_title
       FROM photo_selections ps
       JOIN photos p ON ps.photo_id = p.id
       JOIN galleries g ON p.gallery_id = g.id
       LEFT JOIN gallery_chapters gc ON p.chapter_id = gc.id
       WHERE ps.session_id = $1
       ORDER BY gc.title, p.filename`,
      [sessionId]
    );

    // Organizza i dati
    const gallery = {
      id: session.gallery_id,
      name: selectionsResult.rows.length > 0 ? selectionsResult.rows[0].gallery_name : null,
      description: selectionsResult.rows.length > 0 ? selectionsResult.rows[0].gallery_description : null
    };

    // Organizza le foto per capitolo
    const selectionsByChapter = selectionsResult.rows.reduce((acc, row) => {
      const chapterId = row.chapter_id;
      const chapterTitle = row.chapter_title || 'Senza capitolo';

      if (!acc[chapterTitle]) {
        acc[chapterTitle] = [];
      }

      acc[chapterTitle].push({
        id: row.selection_id,
        photoId: row.photo_id,
        filename: row.filename,
        title: row.title,
        description: row.description
      });

      return acc;
    }, {});

    // Prepara il risultato
    const result = {
      session: {
        id: session.id,
        clientName: session.client_name,
        clientEmail: session.client_email,
        status: session.status,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        notes: session.notes
      },
      gallery,
      selectionsCount: selectionsResult.rows.length,
      selectionsByChapter
    };

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in exportSelections:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
