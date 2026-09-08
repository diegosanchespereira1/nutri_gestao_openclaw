# Publicar Android na Play Store pelo GitHub Actions

O workflow [`.github/workflows/play-store-android.yml`](../../.github/workflows/play-store-android.yml) gera o AAB assinado e envia-o à Play Store.

Não corre no deploy do site. O WebView já carrega `https://nutricao.stratostech.com.br`. Usa isto só quando mudares a casca nativa (versão, ícone, plugins, `capacitor.config`).

## Quando corre

- Tag `v*.*.*` alinhada com `package.json` (ex.: `v1.2.26`)
- Disparo manual em **Actions → Play Store — Android**

Faixa por omissão: **testes internos**. Produção só pelo disparo manual.

## Secrets (Actions → Secrets)

| Secret | Conteúdo |
|--------|----------|
| `ANDROID_KEYSTORE_BASE64` | Keystore de release em Base64 |
| `ANDROID_KEYSTORE_PASSWORD` | Senha do keystore |
| `ANDROID_KEY_ALIAS` | Alias (no projeto: `nutrigestao`) |
| `ANDROID_KEY_PASSWORD` | Senha da chave |
| `PLAY_SERVICE_ACCOUNT_JSON` | JSON completo da conta de serviço do Play |

Codificar o keystore (não commitar o ficheiro):

```bash
base64 -i ~/keystores/nutrigestao-release.keystore | pbcopy
```

No repositório `diegosanchespereira1/nutri_gestao_openclaw`:

```bash
gh secret set ANDROID_KEYSTORE_BASE64 --repo diegosanchespereira1/nutri_gestao_openclaw
gh secret set ANDROID_KEYSTORE_PASSWORD --repo diegosanchespereira1/nutri_gestao_openclaw
gh secret set ANDROID_KEY_ALIAS --repo diegosanchespereira1/nutri_gestao_openclaw
gh secret set ANDROID_KEY_PASSWORD --repo diegosanchespereira1/nutri_gestao_openclaw
gh secret set PLAY_SERVICE_ACCOUNT_JSON --repo diegosanchespereira1/nutri_gestao_openclaw < play-service-account.json
```

## Conta de serviço (uma vez)

1. Ativar [Google Play Android Developer API](https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com).
2. Criar uma service account no Google Cloud **sem** papéis IAM.
3. Gerar chave JSON e guardar em `PLAY_SERVICE_ACCOUNT_JSON`.
4. Play Console → **Utilizadores e permissões** → convidar o e-mail da service account.
5. Permissão no app `br.com.nutrigestao.app`: ver dados da app + lançar para testes internos (e produção, se fores usar essa faixa).

O app já tem de existir na consola. O primeiro AAB de cada app é sempre manual.

## Publicar uma versão

```bash
npm run version:bump-patch
# commit dos ficheiros de versão
git tag v1.2.26
git push openclaw main --tags
```

Ou **Actions → Play Store — Android → Run workflow**.

O environment `play-store` é criado na primeira execução. Podes exigir aprovação manual em Settings → Environments.

## Se o upload falhar

- **Package not found** — o pacote ainda não existe na consola, ou a service account não tem acesso ao app.
- **Precondition check failed** — declarações pendentes na consola. Volta a correr o workflow com *changes not sent for review*, ou fecha o rascunho na Play Console.
- **versionCode already used** — incrementa com `npm run version:bump-patch` antes de nova tag.
