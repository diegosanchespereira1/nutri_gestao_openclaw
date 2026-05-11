/**
 * Preferência apenas no dispositivo (localStorage): anexar coordenadas GPS
 * às fotos de evidência do checklist quando o utilizador o ativa em Definições.
 */
export const CHECKLIST_PHOTO_GPS_STORAGE_KEY = "nutrigestao_pref_checklist_photo_gps";

export function readChecklistPhotoGpsPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CHECKLIST_PHOTO_GPS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeChecklistPhotoGpsPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      window.localStorage.setItem(CHECKLIST_PHOTO_GPS_STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(CHECKLIST_PHOTO_GPS_STORAGE_KEY);
    }
  } catch {
    /* quota ou modo privado */
  }
}
