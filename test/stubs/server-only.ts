/**
 * Stub de `server-only` para os testes unitários.
 *
 * O pacote real lança ao ser importado fora de um Server Component — é um guarda do
 * bundler do Next, não comportamento de runtime. Sem este alias, qualquer módulo com
 * `import "server-only"` fica impossível de testar, que é parte do porquê de
 * lib/billing e lib/signup/webhook-runtime nunca terem tido cobertura.
 */
export {};
