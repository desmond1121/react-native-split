package com.example;

public class SampleBActivity extends BaseSubBundleActivity {

    @Override
    protected String getScriptAssetPath() {
        return "bundle/sample_b/index.bundle";
    }

    @Override
    protected String getMainComponentName() {
        return "SampleB";
    }

}