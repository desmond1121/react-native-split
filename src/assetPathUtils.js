/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */
'use strict';

import type { Asset } from './parser';

// This file is modified based on assetPathUtil.js from react-native.
// @see https://github.com/facebook/react-native/blob/master/local-cli/bundle/assetPathUtils.js

function getAssetPathInDrawableFolder(asset : Asset): Array<string> {
  const paths : Array<string> = [];
  asset.scales.forEach(scale => {
    const drawableFolder = getAndroidDrawableFolderName(asset, scale);
    const fileName =  getAndroidResourceIdentifier(asset);
    paths.push(drawableFolder + '/' + fileName + '.' + asset.type);
  });
  return paths;
}

function getAndroidAssetSuffix(scale : number) {
  switch (scale) {
    case 0.75: return 'ldpi';
    case 1: return 'mdpi';
    case 1.5: return 'hdpi';
    case 2: return 'xhdpi';
    case 3: return 'xxhdpi';
    case 4: return 'xxxhdpi';
  }
}

function getAndroidDrawableFolderName(asset : Asset, scale : number) {
  const suffix = getAndroidAssetSuffix(scale);
  if (!suffix) {
    throw new Error(
      'Don\'t know which android drawable suffix to use for asset: ' +
      JSON.stringify(asset)
    );
  }
  return 'drawable-' + suffix;
}

function getAndroidResourceIdentifier(asset : Asset) {
  const folderPath = getBasePath(asset);
  return (folderPath + '/' + asset.name)
    .toLowerCase()
    .replace(/\//g, '_')           // Encode folder structure in file name
    .replace(/([^a-z0-9_])/g, '')  // Remove illegal chars
    .replace(/^assets_/, '');      // Remove "assets_" prefix
}

function getBasePath(asset : Asset) {
  let basePath = asset.httpServerLocation;
  if (basePath[0] === '/') {
    basePath = basePath.substr(1);
  }
  return basePath;
}

module.exports = {
  getAssetPathInDrawableFolder
};