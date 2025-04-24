import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-for-development-only';

// Funzione per generare un token JWT per i collaboratori
export function generateCollaboratorToken(collaboratorId: number, expiresIn: string = '30d'): string {
  return jwt.sign(
    { 
      collaboratorId,
      type: 'collaborator-dashboard' 
    },
    SECRET_KEY,
    { expiresIn }
  );
}

// Funzione per verificare un token JWT
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    return null;
  }
}

// Middleware per verificare il token del collaboratore
export function verifyCollaboratorToken(token: string, collaboratorId: number): boolean {
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as { collaboratorId: number, type: string };
    return decoded.type === 'collaborator-dashboard' && decoded.collaboratorId === collaboratorId;
  } catch (error) {
    return false;
  }
}