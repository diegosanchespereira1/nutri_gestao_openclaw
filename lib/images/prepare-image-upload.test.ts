import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  prepareImageForUpload,
  prepareMixedFilesInputInPlace,
} from "@/lib/images/prepare-image-upload";

function makeFile(name: string, type = "application/octet-stream"): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

function mockFileInput(files: File[]): HTMLInputElement {
  const input = {
    value: "x",
    files,
  } as unknown as HTMLInputElement;

  Object.defineProperty(input, "files", {
    configurable: true,
    get() {
      return (this as { _files?: FileList })._files ?? files;
    },
    set(next: FileList) {
      (this as { _files?: FileList })._files = next;
    },
  });

  return input;
}

/** DataTransfer não existe no ambiente Node do Vitest. */
class FakeDataTransfer {
  private list: File[] = [];
  items = {
    add: (file: File) => {
      this.list.push(file);
      this.files = {
        length: this.list.length,
        item: (i: number) => this.list[i] ?? null,
        ...Object.fromEntries(this.list.map((f, i) => [i, f])),
        [Symbol.iterator]: function* (this: FileList) {
          for (let i = 0; i < this.length; i++) yield this[i]!;
        },
      } as FileList;
    },
  };
  files: FileList = {
    length: 0,
    item: () => null,
    [Symbol.iterator]: function* () {},
  } as FileList;
}

describe("prepareImageForUpload", () => {
  it("rejeita extensões RAW/edição conhecidas", async () => {
    for (const ext of ["dng", "raw", "cr2", "nef", "arw", "tif", "tiff", "psd"]) {
      const result = await prepareImageForUpload(makeFile(`foto.${ext}`));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(new RegExp(`\\.${ext}`, "i"));
        expect(result.error).toMatch(/não é suportado/i);
      }
    }
  });
});

describe("prepareMixedFilesInputInPlace", () => {
  beforeEach(() => {
    vi.stubGlobal("DataTransfer", FakeDataTransfer);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deixa PDF/DOC passarem intactos e falha limpando input em imagem inválida", async () => {
    const pdf = makeFile("laudo.pdf", "application/pdf");
    const doc = makeFile(
      "termo.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    const raw = makeFile("scan.dng", "image/x-adobe-dng");

    const input = mockFileInput([pdf, doc, raw]);
    const result = await prepareMixedFilesInputInPlace(input);

    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/^scan\.dng:/),
    });
    expect(input.value).toBe("");
  });

  it("reescreve input quando só há documentos", async () => {
    const pdf = makeFile("exame.pdf", "application/pdf");
    const input = mockFileInput([pdf]);

    const result = await prepareMixedFilesInputInPlace(input);
    expect(result).toEqual({ ok: true });
    expect(input.files?.length).toBe(1);
    expect(input.files?.[0]?.name).toBe("exame.pdf");
  });
});
