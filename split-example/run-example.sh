#!/bin/bash

if [ ! -d 'build' ]; then 
  mkdir build
fi

if [ ! -d 'android/app/src/main/assets/bundle' ]; then 
  mkdir -p android/app/src/main/assets/bundle
fi

node ../index.js --platform android --output build --config .splitconfig --dev false

rm -rf android/app/src/main/assets/bundle/*
cp -R build/bundle-output/split/* android/app/src/main/assets/bundle
cd android
./gradlew :app:installDebug
adb shell am start -n com.example/.MainActivity
