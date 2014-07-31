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
    // items
    this.items = {};
    this.items.user = {

    };

    this.items.other_user = {

    }

    this.items.post = {
      path: {
        collection: 'posts',
        key: 'lqefhaeopf12pfnq'
      },
      value: {
        user_key: this.item.user.path.key,
        text: 'wanna hear the sound of twitter? https://github.com/orchestrate-io/orc-twitter-music'
      }
    };

    this.items.comment = {
      path: {
        collection: 'comments',
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
    // mock HTTP
    this.nock = nock("https://api.orchestrate.io");
  });

  it('should automatically denormalize items', function (done) {
    // mock test-specific HTTP
    var nock = this.nock
    .get('/v0/posts')
    .reply(200, {
      count: 1
      results: [this.items.post]
    })
    .get('/v0/users/' + this.items.user.path.key)
    .reply(200, this.items.user.value)
    .put('/v0/denorm_posts/' + this.items.post.path.key)
    .reply(201);

    orc_denorm
    .start({
      collection: this.items.user.path.collection,
      api_key: this.api_key
    })
    .on('update', function (res) {
      assert.equal(res.statusCode, 201);
      nock.done();
      done();
    });
  });

  it('should denormalize items using a custom function', function (done) {
    // mock test-specific HTTP
    var nock = this.nock
    .get('/v0/posts')
    .reply(200, {
      count: 1
      results: [this.items.post]
    })
    .get('/v0/users/' + this.items.user.path.key)
    .reply(200, this.items.user.value)
    .put('/v0/denorm_posts/' + this.items.post.path.key)
    .reply(201)
    .get('/v0/posts/events/comments')
    .reply(200, {
      count: 1,
      results: [this.items.comment]
    })
    .put('/v0/denorm_posts/' + this.items.post.path.key)
    .reply(201);

    // custom denorm function
    orc_denorm.denormalize = function (db, path, item) {
      // run the default denorm function
      this.denormalize(db, path, item)
      .then(function (item) {
        // add a post's comments to the post object
        return db.newEventReader()
        .from(path.collection, path.key)
        .type('comments')
        .list()
        .then(function (res) {
            item.comments = res.results;
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

    orc_denorm
    .start({
      collection: this.items.user.path.collection,
      api_key: this.api_key
    })
    .on('update', function (res) {
      orc_denorm.stop();
      assert.equal(res.statusCode, 201);
      nock.done();
      done();
    });
  });
});
