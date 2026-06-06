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
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int MIN_WEBVIEW_VERSION = 97;
    private static final String WEBVIEW_PACKAGE_SYSTEM = "com.google.android.webview";
    private static final String WEBVIEW_PACKAGE_CHROME  = "com.android.chrome";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);

        if (!isWebViewVersionSufficient()) {
            showWebViewUpdateDialog();
            return;
        }

        super.onCreate(savedInstanceState);

        // Evita edge-to-edge: plugins Capacitor (splash/status bar) resetam padding do WebView.
        applySystemBarInsets();

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
            webView.clearCache(true);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // SplashScreen.hide() e StatusBar podem reativar edge-to-edge após o carregamento.
        applySystemBarInsets();
    }

    /** Conteúdo abaixo da status bar — estável após plugins Capacitor inicializarem. */
    private void applySystemBarInsets() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }

    private boolean isWebViewVersionSufficient() {
        int version = getWebViewMajorVersion(WEBVIEW_PACKAGE_SYSTEM);
        if (version == -1) {
            version = getWebViewMajorVersion(WEBVIEW_PACKAGE_CHROME);
        }
        return version == -1 || version >= MIN_WEBVIEW_VERSION;
    }

    private int getWebViewMajorVersion(String packageName) {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(packageName, 0);
            String versionName = info.versionName;
            if (versionName != null) {
                String major = versionName.split("\\.")[0];
                return Integer.parseInt(major);
            }
        } catch (PackageManager.NameNotFoundException | NumberFormatException ignored) {
        }
        return -1;
    }

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

    private void openPlayStoreForWebView() {
        String playStoreUrl = "market://details?id=" + WEBVIEW_PACKAGE_SYSTEM;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(playStoreUrl)));
        } catch (android.content.ActivityNotFoundException e) {
            startActivity(new Intent(
                Intent.ACTION_VIEW,
                Uri.parse("https://play.google.com/store/apps/details?id=" + WEBVIEW_PACKAGE_SYSTEM)
            ));
        }
    }
}
