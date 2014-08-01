var assert = require('assert');
var kew = require('kew');
var nock = require('nock');

var orc_denorm;
if (process.env.NODE_DEBUG) {
  orc_denorm = require('../');
} else {
  orc_denorm = require('../lib-cov');
}

describe('orc-denorm', function () {
  before(function () {
    // settings
    this.api_key = 'programming in your dentist\'s parking lot';
    // items
    this.items = {};
    this.items.user = {
      path: {
        collection: 'user',
        key: 'garbados'
      },
      value: {
        name: 'Diana Thayer'
      }
    };

    this.items.other_user = {
      path: {
        collection: this.items.user.path.collection,
        key: 'fareytel'
      },
      value: {
        name: 'Catherine Thayer'
      }
    };

    this.items.post = {
      path: {
        collection: 'post',
        key: 'lqefhaeopf12pfnq'
      },
      value: {
        user_key: this.items.user.path.key,
        text: 'wanna hear the sound of twitter? https://github.com/orchestrate-io/orc-twitter-music'
      }
    };

    this.items.comment = {
      path: {
        collection: this.items.post.path.collection,
        key: 'kjehafoeiyqp4fjnqaekwz',
        type: 'comments'
      },
      value: {
        post_key: this.items.post.path.key,
        text: 'lol sounds like classic metroid'
      }
    };

    this.items.like = {
      path: {
        collection: 'likes',
        key: [this.items.post.path.key, this.items.other_user.path.key].join('_')
      },
      value: {
        post_key: this.items.post.path.key,
        user_key: this.items.other_user.path.key
      }
    };
  });

  before(function () {
    // mock http
    this.nock = nock("https://api.orchestrate.io");
  });

  beforeEach(function () {
    // instantiate a separate orc-denorm for each test
    this.orc_denorm = orc_denorm();
  });

  afterEach(function () {
    // clean http mocks for each test
    nock.cleanAll();
  });

  it('should automatically denormalize items', function (done) {
    var self = this;
    // mock test-specific HTTP
    this.nock
    .get('/v0/' + this.items.post.path.collection)
    .reply(200, {
      count: 1,
      results: [this.items.post]
    })
    .get('/v0/' + this.items.user.path.collection + '/' + this.items.user.path.key)
    .reply(200, this.items.user.value)
    .put('/v0/denorm_' + this.items.post.path.collection + '/' + this.items.post.path.key)
    .reply(201);

    this.orc_denorm
    .start({
      collection: this.items.post.path.collection,
      api_key: this.api_key
    })
    .on('update', function (item) {
      self.orc_denorm.stop();
      assert.deepEqual(item.user, self.items.user.value);
    })
    .on('error', function (err) {
      done(err);
    })
    .on('end', function () {
      try {
        self.nock.done();
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('should denormalize items using a custom function', function (done) {
    var self = this;
    // mock test-specific HTTP
    this.nock
    .get('/v0/' + this.items.post.path.collection)
    .reply(200, {
      count: 1,
      results: [this.items.post]
    })
    .get('/v0/' + this.items.user.path.collection + '/' + this.items.user.path.key)
    .reply(200, this.items.user.value)
    .put('/v0/denorm_' + this.items.post.path.collection + '/' + this.items.post.path.key)
    .reply(201)
    .get('/v0/' + this.items.post.path.collection + '/' + this.items.post.path.key + '/events/' + this.items.comment.path.type)
    .reply(200, {
      count: 1,
      results: [this.items.comment]
    })
    .put('/v0/denorm_' + this.items.post.path.collection + '/' + this.items.post.path.key)
    .reply(201);

    // custom denorm function
    this.orc_denorm.denormalize = function (db, path, item) {
      // run the default denorm function
      return this._denormalize(db, path, item)
      .then(function (item) {
        // add a post's comments to the post object
        return db.newEventReader()
        .from(path.collection, path.key)
        .type('comments')
        .list()
        .then(function (res) {
          item.comments = res.body.results;
          return item;
        })
        // save the denormalized post
        .then(function (item) {
          var collection = ['denorm', path.collection].join('_');
          return db.put(collection, path.key, item);
        })
        .then(function () {
          return item;
        });
      });
    };

    this.orc_denorm
    .start({
      collection: this.items.post.path.collection,
      api_key: this.api_key
    })
    .on('update', function (item) {
      self.orc_denorm.stop();
      assert.deepEqual(item.comments[0], self.items.comment);
    })
    .on('error', function (err) {
      done(err);
    })
    .on('end', function () {
      try {
        self.nock.done();
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('should work from the command line', function (done) {
    var self = this;
    // mock test-specific HTTP
    this.nock
    .get('/v0/' + this.items.post.path.collection)
    .reply(200, {
      count: 1,
      results: [this.items.post]
    })
    .get('/v0/' + this.items.user.path.collection + '/' + this.items.user.path.key)
    .reply(200, this.items.user.value)
    .put('/v0/denorm_' + this.items.post.path.collection + '/' + this.items.post.path.key)
    .reply(201);

    this.orc_denorm
    .cli({
      collection: this.items.post.path.collection,
      api_key: this.api_key
    })
    .on('update', function (item) {
      self.orc_denorm.stop();
      assert.deepEqual(item.user, self.items.user.value);
    })
    .on('error', function (err) {
      done(err);
    })
    .on('end', function () {
      try {
        self.nock.done();
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('should work with multiple pages of results', function (done) {
    var self = this;
    // mock test-specific HTTP
    this.nock
    // first page of results
    .get('/v0/' + this.items.post.path.collection)
    .reply(200, {
      count: 1,
      results: [this.items.post]
    }, {
      'Link': '/v0/' + this.items.post.path.collection + '?limit=1&afterKey=' + this.items.post.path.key + '>; rel="next"'
    })
    .get('/v0/' + this.items.user.path.collection + '/' + this.items.user.path.key)
    .reply(200, this.items.user.value)
    .put('/v0/denorm_' + this.items.post.path.collection + '/' + this.items.post.path.key)
    .reply(201)
    .get('/v0/' + this.items.user.path.collection + '/' + this.items.user.path.key)
    .reply(200, this.items.user.value)
    .put('/v0/denorm_' + this.items.post.path.collection + '/' + this.items.post.path.key)
    .reply(201)
    // second page of results
    .get('/v0/' + this.items.post.path.collection + '?limit=1&afterKey=' + this.items.post.path.key)
    .reply(200, {
      count: 1,
      results: [this.items.post]
    });

    var updates = [];

    this.orc_denorm
    .start({
      collection: this.items.post.path.collection,
      api_key: this.api_key
    })
    .on('update', function (item) {
      updates.push(item);
      if (updates.length > 1) {
        self.orc_denorm.stop();
      }
    })
    .on('error', function (err) {
      done(err);
    })
    .on('end', function () {
      try {
        self.nock.done();
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('should handle related object 404s gracefully', function (done) {
    var self = this;
    // mock test-specific HTTP
    this.nock
    .get('/v0/' + this.items.post.path.collection)
    .reply(200, {
      count: 1,
      results: [this.items.post]
    })
    .get('/v0/' + this.items.user.path.collection + '/' + this.items.user.path.key)
    .reply(404)
    .put('/v0/denorm_' + this.items.post.path.collection + '/' + this.items.post.path.key)
    .reply(201);

    this.orc_denorm
    .start({
      collection: this.items.post.path.collection,
      api_key: this.api_key
    })
    .on('update', function (item) {
      self.orc_denorm.stop();
      assert.equal(item.user, null);
    })
    .on('error', function (err) {
      done(err);
    })
    .on('end', function () {
      try {
        self.nock.done();
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('500s while getting related objects should not halt scanning', function (done) {
    var self = this;
    // mock test-specific HTTP
    this.nock
    .get('/v0/' + this.items.post.path.collection)
    .reply(200, {
      count: 1,
      results: [this.items.post]
    })
    .get('/v0/' + this.items.user.path.collection + '/' + this.items.user.path.key)
    .reply(500)
    .get('/v0/' + this.items.post.path.collection)
    .reply(200, {
      count: 1,
      results: [this.items.post]
    })
    .get('/v0/' + this.items.user.path.collection + '/' + this.items.user.path.key)
    .reply(200, this.items.user.value)
    .put('/v0/denorm_' + this.items.post.path.collection + '/' + this.items.post.path.key)
    .reply(201);

    this.orc_denorm
    .start({
      collection: this.items.post.path.collection,
      api_key: this.api_key
    })
    .on('error', function (err) {
      assert.equal(err.statusCode, 500);
    })
    .on('update', function (item) {
      self.orc_denorm.stop();
      assert.deepEqual(item.value, self.items.post.value);
    })
    .on('end', function () {
      try {
        self.nock.done();
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('404s while retrieving the list should not halt scanning', function (done) {
    var self = this;
    // mock test-specific HTTP
    this.nock
    .get('/v0/' + this.items.post.path.collection)
    .reply(404)
    .get('/v0/' + this.items.post.path.collection)
    .reply(200, {
      count: 1,
      results: [this.items.post]
    })
    .get('/v0/' + this.items.user.path.collection + '/' + this.items.user.path.key)
    .reply(200, this.items.user.value)
    .put('/v0/denorm_' + this.items.post.path.collection + '/' + this.items.post.path.key)
    .reply(201);

    this.orc_denorm
    .start({
      collection: this.items.post.path.collection,
      api_key: this.api_key
    })
    .on('update', function (item) {
      self.orc_denorm.stop();
      assert.deepEqual(item.value, self.items.post.value);
    })
    .on('error', function (err) {
      assert.equal(err.statusCode, 404);
    })
    .on('end', function () {
      try {
        self.nock.done();
        done();
      } catch (e) {
        done(e);
      }
    });
  });
});
