package ua.thermoguide.unit;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.*;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView web;
    private ValueCallback<Uri[]> picker;
    private static final int PICK = 11;
    private static final String LOCAL = "file:///android_asset/index.html";
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (LOCAL.equals(uri.toString().split("#", 2)[0])) return false;
                if ("https".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (Exception e) { Toast.makeText(MainActivity.this, "Немає браузера", Toast.LENGTH_SHORT).show(); }
                }
                return true;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, String url) {
                Uri uri = Uri.parse(url);
                if (LOCAL.equals(url.split("#", 2)[0])) return false;
                if ("https".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (Exception e) { Toast.makeText(MainActivity.this, "Немає браузера", Toast.LENGTH_SHORT).show(); }
                }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (picker != null) picker.onReceiveValue(null);
                picker = cb;
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("image/*");
                try { startActivityForResult(i, PICK); }
                catch (Exception e) { picker.onReceiveValue(null); picker = null; }
                return true;
            }
        });
        web.addJavascriptInterface(new Actions(), "GuideApp");
        web.loadUrl(LOCAL);
    }
    public class Actions {
        @JavascriptInterface public void exit() { runOnUiThread(() -> finish()); }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK && picker != null) {
            picker.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data)); picker = null;
        }
    }
    @Override public void onBackPressed() { web.evaluateJavascript("window.guideBack()", null); }
    @Override protected void onDestroy() {
        if (picker != null) { picker.onReceiveValue(null); picker = null; }
        if (web != null) { web.removeJavascriptInterface("GuideApp"); web.destroy(); }
        super.onDestroy();
    }
}
