import jwt from 'jsonwebtoken';

// Secret key utilizzata per firmare e verificare i token JWT
// In un ambiente di produzione, sarà caricata dalle variabili d'ambiente
const JWT_SECRET = process.env.JWT_SECRET || 'studiomaster_collaboratori_dashboard_secret';

/**
 * Genera un token JWT per l'accesso alla dashboard pubblica del collaboratore
 * 
 * @param collaboratorId - ID del collaboratore
 * @param expiresIn - Durata di validità del token (default: null, token senza scadenza)
 * @returns Token JWT firmato
 */
export function generateCollaboratorToken(collaboratorId: number, expiresIn: string | null = null): string {
  const tokenOptions = expiresIn ? { expiresIn } : {};
  
  return jwt.sign(
    { 
      collaboratorId, 
      type: 'dashboard_access',
      timestamp: Date.now()
    }, 
    JWT_SECRET, 
    tokenOptions
  );
}

/**
 * Verifica la validità di un token JWT
 * 
 * @param token - Token JWT da verificare
 * @returns Payload del token se valido, null altrimenti
 */
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Errore durante la verifica del token:', error);
    return null;
  }
}

/**
 * Verifica che un token JWT sia valido e appartenga al collaboratore specificato
 * 
 * @param token - Token JWT da verificare
 * @param collaboratorId - ID del collaboratore
 * @returns true se il token è valido e appartiene al collaboratore, false altrimenti
 */
export function verifyCollaboratorToken(token: string, collaboratorId: number): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Verifica che il token sia per l'accesso alla dashboard
    if (decoded.type !== 'dashboard_access') {
      return false;
    }
    
    // Verifica che il token appartenga al collaboratore specificato
    return decoded.collaboratorId === collaboratorId;
  } catch (error) {
    console.error('Errore durante la verifica del token del collaboratore:', error);
    return false;
  }
}