/**
 * Created by desmond on 4/14/17.
 * @flow
 */
'use strict';
const PixelRatio = require('PixelRatio');
const Platform = require('Platform');
const resolveAssetSource = require('resolveAssetSource');
const { SourceCode } = require('NativeModules');

function getAndroidAssetSuffix(scale) {
  switch (scale) {
    case 0.75: return 'ldpi';
    case 1: return 'mdpi';
    case 1.5: return 'hdpi';
    case 2: return 'xhdpi';
    case 3: return 'xxhdpi';
    case 4: return 'xxxhdpi';
  }
}

function getAndroidDrawableFolderName(asset, scale) {
  var suffix = getAndroidAssetSuffix(scale);
  if (!suffix) {
    throw new Error(
      'Don\'t know which android drawable suffix to use for asset: ' +
      JSON.stringify(asset)
    );
  }
  const androidFolder = 'drawable-' + suffix;
  return androidFolder;
}

function getAndroidResourceIdentifier(asset) {
  var folderPath = getBasePath(asset);
  return (folderPath + '/' + asset.name)
    .toLowerCase()
    .replace(/\//g, '_')           // Encode folder structure in file name
    .replace(/([^a-z0-9_])/g, '')  // Remove illegal chars
    .replace(/^assets_/, '');      // Remove "assets_" prefix
}

function getBasePath(asset) {
  let basePath = asset.httpServerLocation;
  if (basePath[0] === '/') {
    basePath = basePath.substr(1);
  }
  return basePath;
}

function pickScale(scales, deviceScale) {
  // Packager guarantees that `scales` array is sorted
  for (let i = 0; i < scales.length; i++) {
    if (scales[i] >= deviceScale) {
      return scales[i];
    }
  }
  
  // If nothing matches, device scale is larger than any available
  // scales, so we return the biggest one. Unless the array is empty,
  // in which case we default to 1
  return scales[scales.length - 1] || 1;
}

function getAssetPathInDrawableFolder(asset) {
  const scale = pickScale(asset.scales, PixelRatio.get());
  const drawableFolder = getAndroidDrawableFolderName(asset, scale);
  const fileName = getAndroidResourceIdentifier(asset);
  return asset.bundle + '/' + drawableFolder + '/' + fileName + '.' + asset.type;
}

function joinPath() {
  if (arguments.length === 0) {
    return '';
  }
  let result = arguments[0];
  for (let i = 1; i < arguments.length; i++) {
    const candidate = arguments[i];
    if (result.endsWith('/')) {
      if (candidate.startsWith('/')) {
        result += candidate.substring(1);
      } else {
        result += candidate;
      }
    } else {
      if (candidate.startsWith('/')) {
        result += candidate;
      } else {
        result += '/' + candidate;
      }
    }
  }
  return result;
}

function getFolderInBundle(resolver) {
  const path = getBundleBaseDir() || '';
  let bundleRoot = path.substring(0, path.lastIndexOf('/')); // already has scheme
  if (bundleRoot.startsWith('assets://')) {
    bundleRoot = bundleRoot.replace('assets://', 'asset:///'); // fresco's asset image resource uri scheme
  }
  return resolver.fromSource(joinPath(bundleRoot, getAssetPathInDrawableFolder(resolver.asset)));
}

function defaultAsset(resolver) {
  if (resolver.isLoadedFromServer()) {
    return resolver.assetServerURL();
  }
  
  if (Platform.OS === 'android') {
    return getFolderInBundle(resolver); // hooked by us
  } else {
    return resolver.scaledAssetPathInBundle();
  }
}

let bundleBaseDir;

function getBundleBaseDir() {
  if (bundleBaseDir === undefined) {
    const scriptURL = SourceCode.scriptURL;
    if (!scriptURL) {
      // scriptURL is falsy, we have nothing to go on here
      bundleBaseDir = null;
      return bundleBaseDir;
    }
    // cut file://abc/base/index.bundle => file://abc/
    let bundleDir = scriptURL.substring(0, scriptURL.lastIndexOf('/'));
    bundleBaseDir = bundleDir.substring(0, scriptURL.lastIndexOf('/') + 1);
  }
  
  return bundleBaseDir;
}

resolveAssetSource.setCustomSourceTransformer(resolver => {
  return defaultAsset(resolver);
});