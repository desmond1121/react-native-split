/**
 * Created by desmond on 4/13/17.
 */
'use strict';
const assetPathUtil = require('../assetPathUtils');

test('Test get asset rename', () => {
  const asset = {
    __packager_asset: true,
    httpServerLocation: '/assets/src/assets',
    width: 960,
    height: 540,
    scales: [1, 1.5, 2, 3],
    hash: '58152c62118ac492f12163c5521041fd',
    name: 'naruto',
    type: 'jpeg'
  };

  const expected = [
    'drawable-mdpi/src_assets_naruto.jpeg',
    'drawable-hdpi/src_assets_naruto.jpeg',
    'drawable-xhdpi/src_assets_naruto.jpeg',
    'drawable-xxhdpi/src_assets_naruto.jpeg'
  ];
  expect(assetPathUtil.getAssetPathInDrawableFolder(asset)).toEqual(expected);
});