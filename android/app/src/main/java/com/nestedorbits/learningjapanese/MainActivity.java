package com.nestedorbits.learningjapanese;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Logger;

/**
 * Capacitor 8's BridgeActivity does not route the back gesture to the WebView at
 * all, so the default AppCompatActivity behaviour finishes the activity on every
 * press - even while the app has session history.
 *
 * The catch is that WebView.canGoBack() only knows about *document*
 * navigations. This app is a single page that pushes history entries with
 * history.pushState(), and those entries are invisible to canGoBack(): it returns
 * false while the page is several screens deep, so routing back through it would
 * still close the app.
 *
 * So the page reports its own depth: app.js counts its history entries (history
 * .length is a high-water mark and never shrinks, so it can't be used here) and
 * pushes that value here. This callback is enabled only while there is somewhere
 * to go back to; with no depth left it disables itself and re-dispatches so the
 * platform closes the app normally.
 */
public class MainActivity extends BridgeActivity {

    private int webBackDepth = 0;

    /**
     * Exposed to the bundled app as window.LJBack. Only reachable from our own
     * local assets: the app ships no remote content and requests no INTERNET
     * permission, so there is nothing untrusted that could call this.
     */
    private final class BackDepth {
        @JavascriptInterface
        public void setDepth(int depth) {
            runOnUiThread(() -> {
                if (depth == webBackDepth) return;
                webBackDepth = Math.max(0, depth);
                Logger.debug("Back depth: " + webBackDepth);
                if (backCallback != null) backCallback.setEnabled(webBackDepth > 0);
            });
        }
    }

    private OnBackPressedCallback backCallback;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().addJavascriptInterface(new BackDepth(), "LJBack");
        }

        backCallback = new OnBackPressedCallback(false) {
            @Override
            public void handleOnBackPressed() {
                if (webBackDepth > 0 && bridge != null && bridge.getWebView() != null) {
                    /* Ask the page to step back itself. WebView.goBack() only walks
                       *document* navigations and silently ignores the same-document
                       entries this single-page app pushes, so the gesture has to be
                       handed to the page to fire popstate. */
                    bridge.getWebView().evaluateJavascript("window.history.back()", null);
                    return;
                }
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
            }
        };
        getOnBackPressedDispatcher().addCallback(this, backCallback);
    }
}
