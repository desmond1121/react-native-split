/**
 * Created by desmond on 4/13/17.
 */
'use strict';

require('babel-register')({
  presets: ['es2015-node'],
  plugins: [
    'transform-flow-strip-types'
  ]
});