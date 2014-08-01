function OrcDenorm () {
  // lol what a weird approach this is
}

OrcDenorm.prototype.start = require('./start');
OrcDenorm.prototype.cli = require('./cli');
// denormalize function that users can overwrite
OrcDenorm.prototype.denormalize = require('./denormalize');
// the original, in case `denormalize` is overwritten
OrcDenorm.prototype._denormalize = require('./denormalize');

module.exports = function () {
  return new OrcDenorm();
};
