/**
 * Created by desmond on 4/13/17.
 */
'use strict';
require('./src/setupBabel');

const fs = require('fs');
const path = require('path');
const commander = require('commander');
const Util = require('./src/utils');
const Parser = require('./src/parser');
const bundle = require('./src/bundler');

commander
  .description('React Native Bundle Spliter')
  .option('--output <path>', 'Path to store bundle.', 'build')
  .option('--config <path>', 'Config file for react-native-split.')
  .option('--platform', 'Specify bundle platform. ', 'android')
  .option('--dev [boolean]', 'Generate dev module.')
  .parse(process.argv);

if (!commander.config) {
  throw new Error('You must enter an config file (by --config).');
}

function isFileExists(fname) {
  try {
    fs.accessSync(fname, fs.F_OK);
    return true;
  } catch (e) {
    return false;
  }
}

const configFile = path.resolve(process.cwd(), commander.config);
const outputDir = path.resolve(process.cwd(), commander.output);

if (!isFileExists(configFile)) {
  console.log('Config file ' + configFile + ' is not exists!');
  process.exit(-1);
}

const rawConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
const workRoot = path.dirname(configFile);
const outputRoot = path.join(outputDir, `bundle-output`);
Util.ensureFolder(outputRoot);

const config = {
  root: workRoot,
  dev: commander.dev === 'true',
  packageName : rawConfig['package'],
  platform : commander.platform,
  outputDir : path.join(outputRoot, 'split'),
  bundleDir : path.join(outputRoot, 'bundle'),
  baseEntry : {
    index: rawConfig.base.index,
    includes: rawConfig.base.includes
  },
  baseVersion: rawConfig.base.version,
  customEntries : rawConfig.custom
};
if (!isFileExists(config.baseEntry.index)) {
  console.log('Index of base does not exists!');
}

console.log('Work on root: ' + config.root);
console.log('Dev mode: ' + config.dev);
bundle(config, (err, data) => {
  if (err) throw err;
  console.log('===[Bundle] Finish!===');
  const parser = new Parser(data, config);
  parser.splitBundle();
});


