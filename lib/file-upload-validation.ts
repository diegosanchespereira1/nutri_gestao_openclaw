/**
 * File upload validation utilities
 * Ensures only safe file types and sizes are accepted
 */

export interface FileValidationError {
  field: string;
  error: string;
}

// Allowed MIME types for different purposes
export const ALLOWED_MIME_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/webp'],
  documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  spreadsheets: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
} as const;

// Maximum file sizes (in bytes)
export const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  avatar: 2 * 1024 * 1024, // 2MB
} as const;

/**
 * Validate image file (for photos, avatars, etc)
 */
export function validateImageFile(
  file: File,
  maxSize: number = MAX_FILE_SIZES.image
): FileValidationError | null {
  // Check MIME type
  if (!(ALLOWED_MIME_TYPES.images as readonly string[]).includes(file.type)) {
    return {
      field: 'file',
      error: `Tipo de ficheiro inválido. Aceites: JPEG, PNG, WebP. Recebido: ${file.type || 'desconhecido'}.`,
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxMB = maxSize / 1024 / 1024;
    return {
      field: 'file',
      error: `Ficheiro muito grande. Máximo: ${maxMB}MB. Tamanho: ${(file.size / 1024 / 1024).toFixed(1)}MB.`,
    };
  }

  // Check that file is not empty
  if (file.size === 0) {
    return {
      field: 'file',
      error: 'Ficheiro vazio. Envie um ficheiro válido.',
    };
  }

  return null;
}

/**
 * Validate document file (PDF, Word, etc)
 */
export function validateDocumentFile(
  file: File,
  maxSize: number = MAX_FILE_SIZES.document
): FileValidationError | null {
  // Check MIME type
  if (!(ALLOWED_MIME_TYPES.documents as readonly string[]).includes(file.type)) {
    return {
      field: 'file',
      error: `Tipo de ficheiro inválido. Aceites: PDF, Word. Recebido: ${file.type || 'desconhecido'}.`,
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxMB = maxSize / 1024 / 1024;
    return {
      field: 'file',
      error: `Ficheiro muito grande. Máximo: ${maxMB}MB.`,
    };
  }

  if (file.size === 0) {
    return {
      field: 'file',
      error: 'Ficheiro vazio.',
    };
  }

  return null;
}

/**
 * Validate spreadsheet file (CSV, Excel)
 */
export function validateSpreadsheetFile(
  file: File,
  maxSize: number = MAX_FILE_SIZES.document
): FileValidationError | null {
  // Check MIME type
  if (!(ALLOWED_MIME_TYPES.spreadsheets as readonly string[]).includes(file.type)) {
    return {
      field: 'file',
      error: `Tipo de ficheiro inválido. Aceites: CSV, Excel. Recebido: ${file.type || 'desconhecido'}.`,
    };
  }

  // Check file size
  if (file.size > maxSize) {
    return {
      field: 'file',
      error: `Ficheiro muito grande. Máximo: ${(maxSize / 1024 / 1024).toFixed(0)}MB.`,
    };
  }

  if (file.size === 0) {
    return {
      field: 'file',
      error: 'Ficheiro vazio.',
    };
  }

  return null;
}

/**
 * Generate safe filename
 * Removes special characters and potential path traversal attempts
 */
export function generateSafeFilename(originalName: string, prefix?: string): string {
  // Extract extension
  const ext = originalName.split('.').pop()?.toLowerCase() || '';

  // Remove special characters, keep only alphanumeric and hyphen/underscore
  const safe = originalName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-z0-9_-]/gi, '_') // Replace special chars
    .replace(/_+/g, '_') // Collapse multiple underscores
    .substring(0, 50); // Limit length

  // Generate filename with UUID prefix for uniqueness
  const uuid = crypto.randomUUID().split('-')[0];
  return `${prefix ? prefix + '_' : ''}${uuid}_${safe}.${ext}`;
}
