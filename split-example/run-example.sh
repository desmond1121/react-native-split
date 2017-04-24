#!/bin/bash

node ../index.js --platform android --output build --config .splitconfig --dev true

mkdirs android/app/src/main/assets/bundle
rm -rf android/app/src/main/assets/bundle/*
cp -R build/bundle-output/split/* android/app/src/main/assets/bundle
cd android
./gradlew :app:installDebug
adb shell am start -n com.example/.MainActivity