const _ = require('lodash');

module.exports = function() {
  _.isEmpty('abc');
  console.log('This is module B! I have lodash too!');
};