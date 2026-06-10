import { describe, expect, it } from "vitest";

import {
  extensionForCanonicalImageMime,
  normalizeImageMime,
} from "./image-mime";

describe("normalizeImageMime", () => {
  describe("MIME canónicos", () => {
    it("aceita image/jpeg, image/png e image/webp", () => {
      expect(normalizeImageMime("image/jpeg")).toBe("image/jpeg");
      expect(normalizeImageMime("image/png")).toBe("image/png");
      expect(normalizeImageMime("image/webp")).toBe("image/webp");
    });

    it("ignora maiúsculas e espaços", () => {
      expect(normalizeImageMime(" IMAGE/JPEG ")).toBe("image/jpeg");
      expect(normalizeImageMime("Image/Png")).toBe("image/png");
    });
  });

  describe("aliases não-padrão (caso do bug com .jpg)", () => {
    it("normaliza image/jpg para image/jpeg", () => {
      expect(normalizeImageMime("image/jpg", "foto.jpg")).toBe("image/jpeg");
      expect(normalizeImageMime("image/jpg")).toBe("image/jpeg");
    });

    it("normaliza variantes legadas de JPEG", () => {
      expect(normalizeImageMime("image/pjpeg")).toBe("image/jpeg");
      expect(normalizeImageMime("image/jfif")).toBe("image/jpeg");
    });

    it("normaliza image/x-png para image/png", () => {
      expect(normalizeImageMime("image/x-png")).toBe("image/png");
    });
  });

  describe("fallback pela extensão (MIME vazio ou genérico)", () => {
    it("resolve .jpg/.jpeg/.jfif como JPEG quando o MIME está vazio", () => {
      expect(normalizeImageMime("", "foto.jpg")).toBe("image/jpeg");
      expect(normalizeImageMime(null, "foto.jpeg")).toBe("image/jpeg");
      expect(normalizeImageMime(undefined, "foto.jfif")).toBe("image/jpeg");
    });

    it("resolve .png e .webp quando o MIME é application/octet-stream", () => {
      expect(normalizeImageMime("application/octet-stream", "logo.png")).toBe(
        "image/png",
      );
      expect(normalizeImageMime("application/octet-stream", "logo.webp")).toBe(
        "image/webp",
      );
    });

    it("a extensão é case-insensitive", () => {
      expect(normalizeImageMime("", "FOTO.JPG")).toBe("image/jpeg");
    });

    it("rejeita extensão não suportada quando o MIME está vazio", () => {
      expect(normalizeImageMime("", "video.mp4")).toBeNull();
      expect(normalizeImageMime("", "documento.pdf")).toBeNull();
      expect(normalizeImageMime("", "sem-extensao")).toBeNull();
      expect(normalizeImageMime("")).toBeNull();
    });
  });

  describe("formatos não suportados", () => {
    it("rejeita outros tipos de imagem", () => {
      expect(normalizeImageMime("image/gif", "anim.gif")).toBeNull();
      expect(normalizeImageMime("image/heic", "foto.heic")).toBeNull();
      expect(normalizeImageMime("image/svg+xml", "icone.svg")).toBeNull();
    });

    it("rejeita tipos que não são imagem", () => {
      expect(normalizeImageMime("application/pdf", "doc.pdf")).toBeNull();
      expect(normalizeImageMime("video/mp4", "video.mp4")).toBeNull();
    });

    it("não usa a extensão quando o MIME declarado é explícito e não suportado", () => {
      // Um ficheiro renomeado para .jpg mas declarado como GIF deve ser rejeitado.
      expect(normalizeImageMime("image/gif", "falso.jpg")).toBeNull();
    });
  });
});

describe("extensionForCanonicalImageMime", () => {
  it("devolve a extensão adequada para cada MIME canónico", () => {
    expect(extensionForCanonicalImageMime("image/jpeg")).toBe("jpg");
    expect(extensionForCanonicalImageMime("image/png")).toBe("png");
    expect(extensionForCanonicalImageMime("image/webp")).toBe("webp");
  });
});
