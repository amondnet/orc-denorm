var yargs = require('yargs');

function cli (options) {
  options = options || {};
  var argv = yargs
    .help('help')
    .alias('h', 'help')
    .usage('$0 -u ORCHESTRATE_API_KEY -c ORCHESTRATE_COLLECTION')
    .alias('u', 'api-key')
    .default('u', options.api_key || process.env.ORCHESTRATE_API_KEY)
    .describe('u', 'Your Orchestrate API key')
    .alias('c', 'collection')
    .default('c', options.collection || process.env.ORCHESTRATE_COLLECTION)
    .describe('c', 'The Orchestrate collection you want orc-denorm to denormalize from')
    .argv;

  return this.start({
    api_key: argv.u,
    collection: argv.c
  });
}

module.exports = cli;
