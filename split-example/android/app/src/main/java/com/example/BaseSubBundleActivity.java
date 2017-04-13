package com.example;

import android.app.Activity;
import android.os.AsyncTask;
import android.os.Bundle;
import android.support.annotation.Nullable;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactRootView;
import com.facebook.react.bridge.CatalystInstance;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.common.LifecycleState;

/**
 * Created by desmond on 4/17/17.
 */
public abstract class BaseSubBundleActivity extends Activity {

    private ReactRootView mReactRootView;

    private final class LoadScriptTask extends AsyncTask<Void, Void, Void> {

        @Override
        protected Void doInBackground(Void... params) {
            CatalystInstance instance = Utils.getCatalystInstance(getReactNativeHost());
            Utils.loadScriptFromAsset(BaseSubBundleActivity.this,
                instance,
                getScriptAssetPath());
            return null;
        }

        @Override
        protected void onPostExecute(Void aVoid) {
            getReactNativeHost().getReactInstanceManager().attachMeasuredRootView(mReactRootView);
        }

    }

    private ReactNativeHost getReactNativeHost() {
        return ((ReactApplication) getApplication()).getReactNativeHost();
    }

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mReactRootView = new ReactRootView(this);

        Utils.setJsModuleName(mReactRootView, getMainComponentName());
        setContentView(mReactRootView);

        ReactInstanceManager manager = getReactNativeHost().getReactInstanceManager();
        LifecycleState state = manager.getLifecycleState();
        switch (state) {
            case BEFORE_CREATE:
            case BEFORE_RESUME:
            default:
                if (!manager.hasStartedCreatingInitialContext()) {
                    manager.createReactContextInBackground();
                }
                manager.addReactInstanceEventListener(new ReactInstanceManager.ReactInstanceEventListener() {
                    @Override
                    public void onReactContextInitialized(ReactContext reactContext) {
                        loadScriptAsync();
                    }
                });
                break;
            case RESUMED:
                loadScriptAsync();
                break;
        }
    }

    private void loadScriptAsync() {
        LoadScriptTask task = new LoadScriptTask();
        task.executeOnExecutor(AsyncTask.THREAD_POOL_EXECUTOR);
    }

    @Override
    protected void onDestroy() {
        ReactInstanceManager manager = getReactNativeHost().getReactInstanceManager();
        manager.detachRootView(mReactRootView);
        super.onDestroy();
    }

    protected abstract String getScriptAssetPath();

    protected abstract String getMainComponentName();

}
