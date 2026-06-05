'use client';

import { isNativeApp } from './platform';

/**
 * Resultado unificado da câmera — funciona tanto no browser
 * (via <input type=file>) quanto no app nativo (via @capacitor/camera).
 */
export interface NativeCameraResult {
  /** File object para compatibilidade com o fluxo de upload existente */
  file: File;
}

/** Converte base64 string em File. */
function base64ToFile(base64: string, mimeType: string): File {
  const byteString = atob(base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeType });
  return new File([blob], `foto_${Date.now()}.jpg`, { type: mimeType });
}

/** Converte webPath (URL blob nativa do Capacitor) em File via fetch. */
async function webPathToFile(webPath: string, format: string): Promise<File> {
  const response = await fetch(webPath);
  const blob = await response.blob();
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  return new File([blob], `foto_${Date.now()}.jpg`, { type: mimeType });
}

/** Strings de cancelamento retornadas pelo plugin em iOS e Android. */
function isCancelError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('cancelled') ||
    msg.includes('canceled') ||
    msg.includes('No image') ||
    msg.includes('User cancelled')
  );
}

/**
 * Abre a câmera traseira usando o plugin Capacitor no app nativo.
 * No browser retorna null — o componente usa o <input type=file> normalmente.
 */
export async function openNativeCamera(): Promise<NativeCameraResult | null> {
  if (!isNativeApp()) return null;

  // Import dinâmico — evita erro de bundle no browser/SSR
  const { Camera, CameraResultType, CameraSource } = await import(
    '@capacitor/camera'
  );

  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
      correctOrientation: true,
      saveToGallery: false,
    });

    if (!photo.base64String) return null;

    const mimeType = photo.format === 'png' ? 'image/png' : 'image/jpeg';
    return { file: base64ToFile(photo.base64String, mimeType) };
  } catch (err) {
    if (isCancelError(err)) return null;
    throw err;
  }
}

/**
 * Abre a galeria de fotos usando o plugin Capacitor no app nativo.
 * No browser retorna [] — o componente usa o <input type=file> normalmente.
 */
export async function openNativeGallery(
  limit = 5,
): Promise<NativeCameraResult[]> {
  if (!isNativeApp()) return [];

  const { Camera } = await import('@capacitor/camera');

  try {
    const result = await Camera.pickImages({ quality: 85, limit });

    const photos: NativeCameraResult[] = [];
    for (const photo of result.photos) {
      // GalleryPhoto usa webPath (URL blob) em vez de base64String
      const file = await webPathToFile(photo.webPath, photo.format);
      photos.push({ file });
    }

    return photos;
  } catch (err) {
    if (isCancelError(err)) return [];
    throw err;
  }
}
