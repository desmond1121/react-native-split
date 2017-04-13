// this sample is used for test require module in secondary or lower level.

const Module = {
  FuncA: require('./ModuleA'),
  FuncB: require('./ModuleB')
};

module.exports = Module;