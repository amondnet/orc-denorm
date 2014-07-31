var orchestrate = require('orchestrate');
var async = require('async');
var EventEmitter = require('events').EventEmitter;

function start (options) {
  this.should_stop = false;
  this.collection = options.collection;
  this.db = orchestrate(options.api_key);
  this.emitter = new EventEmitter();
  this.scan = scan.bind(this);
  this.stop = stop.bind(this);

  this.scan();

  return this.emitter;
}

function stop () {
  this.should_stop = true;
}

function scan (next) {
  var self = this;
  var promise;
  if (next) {
    promise = next.get();
  } else {
    promise = this.db.list(this.collection);
  }

  if (!this.should_stop) {
    return promise
    .then(function (res) {
      async.map(res.body.results, function (result, done) {
        self.denormalize(self.db, result.path, result.value)
        .then(function (item) {
          self.emitter.emit('update', item);
        })
        .fail(function (err) {
          self.emitter.emit('error', err);
        })
        .fin(function () {
          done();
        });
      }, function (err) {
        self.scan(res.links && res.links.next);
      });
    })
    .fail(function (err) {
      self.emitter.emit('error', err);
      throw err;
    });
  } else {
    this.emitter.emit('end');
    return false;
  }
}

module.exports = start;
