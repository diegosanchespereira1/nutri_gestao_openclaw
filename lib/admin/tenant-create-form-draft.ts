const DRAFT_STORAGE_KEY = "admin-create-tenant-draft";

export function saveTenantCreateFormDraft(form: HTMLFormElement): void {
  try {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, serializeTenantCreateForm(form));
  } catch {
    // Ignora quota / modo privado
  }
}

export function loadTenantCreateFormDraft(): string | null {
  try {
    return sessionStorage.getItem(DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearTenantCreateFormDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // noop
  }
}

export function serializeTenantCreateForm(form: HTMLFormElement): string {
  const payload: Record<string, string | boolean> = {};

  for (const element of form.elements) {
    if (
      !(element instanceof HTMLInputElement) &&
      !(element instanceof HTMLSelectElement) &&
      !(element instanceof HTMLTextAreaElement)
    ) {
      continue;
    }

    const name = element.name;
    if (!name) continue;

    if (element instanceof HTMLInputElement) {
      if (element.type === "checkbox") {
        payload[name] = element.checked;
        continue;
      }
      if (element.type === "radio") {
        if (element.checked) payload[name] = element.value;
        continue;
      }
    }

    payload[name] = element.value;
  }

  return JSON.stringify(payload);
}

export function restoreTenantCreateForm(
  form: HTMLFormElement,
  raw: string,
): void {
  const payload = JSON.parse(raw) as Record<string, string | boolean>;

  for (const element of form.elements) {
    if (
      !(element instanceof HTMLInputElement) &&
      !(element instanceof HTMLSelectElement) &&
      !(element instanceof HTMLTextAreaElement)
    ) {
      continue;
    }

    const name = element.name;
    if (!name || !(name in payload)) continue;

    const value = payload[name];

    if (element instanceof HTMLInputElement) {
      if (element.type === "checkbox") {
        element.checked = value === true;
        continue;
      }
      if (element.type === "radio") {
        element.checked = element.value === String(value);
        continue;
      }
    }

    element.value = String(value);
  }

  form.dispatchEvent(new Event("change", { bubbles: true }));
}
