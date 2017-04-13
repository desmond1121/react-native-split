package com.example;

import android.content.Context;
import android.content.res.AssetManager;
import android.support.annotation.Nullable;
import android.support.annotation.WorkerThread;

import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactRootView;
import com.facebook.react.bridge.CatalystInstance;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.cxxbridge.CatalystInstanceImpl;

import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.HashSet;
import java.util.Set;

/**
 * Utils for sample, just some hacks since I can't change source code in this project.
 *
 * Created by desmond on 4/17/17.
 */
class Utils {

    private static Set<String> sLoadedScript = new HashSet<>();

    static void recreateReactContextInBackgroundInner(ReactInstanceManager manager) {
        try {
            Method method = ReactInstanceManager.class.getDeclaredMethod("recreateReactContextInBackgroundInner");
            method.setAccessible(true);
            method.invoke(manager);
        } catch (NoSuchMethodException e) {
            e.printStackTrace();
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        } catch (InvocationTargetException e) {
            e.printStackTrace();
        }
    }

    static void moveResume(ReactInstanceManager manager, boolean force) {
        try {
            Method method = ReactInstanceManager.class.getDeclaredMethod("moveToResumedLifecycleState", boolean.class);
            method.setAccessible(true);
            method.invoke(manager, force);
        } catch (NoSuchMethodException e) {
            e.printStackTrace();
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        } catch (InvocationTargetException e) {
            e.printStackTrace();
        }
    }

    static void setJsModuleName(ReactRootView rootView, String moduleName) {
        try {
            Field field = ReactRootView.class.getDeclaredField("mJSModuleName");
            field.setAccessible(true);
            field.set(rootView, moduleName);
        } catch (NoSuchFieldException e) {
            e.printStackTrace();
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        }
    }

    @Nullable
    static CatalystInstance getCatalystInstance(ReactNativeHost host) {
        ReactInstanceManager manager = host.getReactInstanceManager();
        if (manager == null) {
            return null;
        }

        ReactContext context = manager.getCurrentReactContext();
        if (context == null) {
            return null;
        }
        return context.getCatalystInstance();
    }

    @Nullable
    public static String getSourceUrl(CatalystInstance instance) {
        try {
            Field field = CatalystInstanceImpl.class.getDeclaredField("mSourceURL");
            field.setAccessible(true);
            return (String) field.get(instance);
        } catch (NoSuchFieldException e) {
            e.printStackTrace();
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        }
        return null;
    }

    @WorkerThread
    static void loadScriptFromAsset(Context context,
                                             CatalystInstance instance,
                                             String assetName) {
        if (sLoadedScript.contains(assetName)) {
            return;
        }
        try {
            String source = "assets://" + assetName;
            Method method = CatalystInstanceImpl.class.getDeclaredMethod("loadScriptFromAssets",
                AssetManager.class,
                String.class);
            method.setAccessible(true);
            method.invoke(instance, context.getAssets(), source);
            sLoadedScript.add(assetName);
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        } catch (NoSuchMethodException e) {
            e.printStackTrace();
        } catch (InvocationTargetException e) {
            e.printStackTrace();
        }
    }

}
