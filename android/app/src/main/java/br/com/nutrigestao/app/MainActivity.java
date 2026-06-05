package br.com.nutrigestao.app;

import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.appcompat.app.AlertDialog;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Capacitor 8 requer WebView (Chromium) versão 97+.
    // Abaixo disso o app pode abrir em branco ou crashar silenciosamente.
    private static final int MIN_WEBVIEW_VERSION = 97;

    // Package name do Android System WebView / Chrome (ambos fornecem o WebView)
    private static final String WEBVIEW_PACKAGE_SYSTEM = "com.google.android.webview";
    private static final String WEBVIEW_PACKAGE_CHROME  = "com.android.chrome";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);

        // Verificar versão do WebView ANTES de inicializar o Capacitor Bridge.
        // Se o WebView estiver desatualizado, mostrar dialog e não abrir o app.
        if (!isWebViewVersionSufficient()) {
            showWebViewUpdateDialog();
            return; // não chama super.onCreate → Capacitor não inicializa
        }

        super.onCreate(savedInstanceState);

        // Desabilitar cache para sempre carregar conteúdo fresco do servidor.
        // Resolve o problema de HTML antigo sendo servido após deploy.
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
            webView.clearCache(true);
        }
    }

    /**
     * Verifica se a versão instalada do Android WebView é suficiente
     * para rodar o Capacitor 8 (mínimo: Chromium 97).
     *
     * O WebView é fornecido pelo "Android System WebView" ou pelo Chrome,
     * dependendo da versão do Android e do OEM.
     */
    private boolean isWebViewVersionSufficient() {
        int version = getWebViewMajorVersion(WEBVIEW_PACKAGE_SYSTEM);
        if (version == -1) {
            version = getWebViewMajorVersion(WEBVIEW_PACKAGE_CHROME);
        }
        // Se não conseguiu detectar a versão, assume suficiente para não bloquear
        // dispositivos onde o WebView foi incorporado de outra forma.
        return version == -1 || version >= MIN_WEBVIEW_VERSION;
    }

    /**
     * Retorna o major version do pacote informado, ou -1 se não encontrado.
     * Exemplo: "97.0.4692.71" → 97
     */
    private int getWebViewMajorVersion(String packageName) {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(packageName, 0);
            String versionName = info.versionName; // ex: "97.0.4692.71"
            if (versionName != null) {
                String major = versionName.split("\\.")[0];
                return Integer.parseInt(major);
            }
        } catch (PackageManager.NameNotFoundException | NumberFormatException ignored) {
            // pacote não encontrado ou formato inesperado
        }
        return -1;
    }

    /**
     * Exibe um dialog informando que o WebView precisa ser atualizado,
     * com botão para abrir a Play Store direto na página do Android System WebView.
     */
    private void showWebViewUpdateDialog() {
        new AlertDialog.Builder(this)
            .setTitle("Atualização necessária")
            .setMessage(
                "Para usar o NutriGestão, seu dispositivo precisa de uma versão " +
                "atualizada do Android System WebView.\n\n" +
                "Abra a Play Store, atualize o \"Android System WebView\" e " +
                "tente abrir o app novamente."
            )
            .setPositiveButton("Atualizar agora", new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface dialog, int which) {
                    openPlayStoreForWebView();
                    finish();
                }
            })
            .setNegativeButton("Fechar", new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface dialog, int which) {
                    finish();
                }
            })
            .setCancelable(false)
            .show();
    }

    /** Abre a Play Store na página do Android System WebView. */
    private void openPlayStoreForWebView() {
        String playStoreUrl = "market://details?id=" + WEBVIEW_PACKAGE_SYSTEM;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(playStoreUrl)));
        } catch (android.content.ActivityNotFoundException e) {
            // Fallback para browser caso a Play Store não esteja instalada
            startActivity(new Intent(
                Intent.ACTION_VIEW,
                Uri.parse("https://play.google.com/store/apps/details?id=" + WEBVIEW_PACKAGE_SYSTEM)
            ));
        }
    }
}
