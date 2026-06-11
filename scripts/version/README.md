# Versão da app (web + Capacitor)

## Rodapé automático no commit

Com [Husky](https://typicode.github.io/husky/), o hook **`prepare-commit-msg`** acrescenta ao fim da mensagem:

```text
[app v1.2.2]
```

O número vem de `package.json` → `version`. Não incrementa sozinho.

Commits `merge` / `squash` não são alterados.

## Incrementar versão (patch) + Android + iOS

Quando fores publicar build nas lojas:

```bash
npm run version:bump-patch
```

Isto:

- sobe o **patch** em `package.json` (ex.: 1.2.2 → 1.2.3);
- em `android/app/build.gradle`: **versionCode +1** e **versionName** = nova versão;
- em `ios/.../project.pbxproj`: **MARKETING_VERSION** e **CURRENT_PROJECT_VERSION** (build) alinhados.

Depois: `git add package.json android/app/build.gradle ios/App/App.xcodeproj/project.pbxproj` e commit normal.

## Opcional: incrementar em cada commit

Não é o padrão (gera muitas versões e ruído nas lojas). Se quiseres na mesma:

```bash
BUMP_APP_VERSION_ON_COMMIT=1 git commit
```

O hook **pre-commit** corre `bump-app-version.mjs` e faz `git add` dos ficheiros de versão antes da mensagem ser finalizada.
