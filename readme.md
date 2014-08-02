# orc-denorm

[![Build Status](https://travis-ci.org/orchestrate-io/orc-denorm.svg?branch=master)](https://travis-ci.org/orchestrate-io/orc-denorm)
[![Coverage Status](https://coveralls.io/repos/orchestrate-io/orc-denorm/badge.png?branch=master)](https://coveralls.io/r/orchestrate-io/orc-denorm?branch=master)

[![NPM](https://nodei.co/npm/orc-denorm.png)](https://nodei.co/npm/orc-denorm/)

Denormalize [Orchestrate](http://orchestrate.io/) items in the background.

## Install

To get orc-denorm, you'll need [node.js](). Once you've got that installed, install orc-denorm like this:

    npm install -g orc-denorm

That gives you access to orc-denorm's CLI. To install orc-denorm as a dependency of another project, install like this:

    npm install orc-denorm

## Usage

To run orc-denorm with just the default settings, do this:

    orc-denorm -u YOUR_API_KEY -c COLLECTION

This will examine every item in `COLLECTION` for fields named like `[collection]_key`, use their value to find the item they refer to, and create a new document in `denorm_COLLECTION` where those `[collection]_key` fields have been changed to include the whole item they refer to, rather than just its key. So, for example, this document from a `like` collection:

    {
        user_key: '...',
        post_key: '...'
    }

... will be turned into this:

    {
        user: {
            ...
        },
        post: {
            ...
        }
    }

With the same key as the original, but in the `denorm_like` collection.

### Customization

To customize how orc-denorm handles documents, you can write your own script:

``` javascript
var orc_denorm = require('orc-denorm')();

// the custom denormalization function
// must return a promise
orc_denorm.denormalize = function (db, path, item) {
    // db is an authenticated orchestrate.js client
    // path == { collection: '...', key: '...', ref: '...'}
    // item == { /* the item's value */ }

    // let's run the default denormalization function first
    return this._denormalize(db, path, item)
    .then(function (item) {
        // then let's add a post's comments to the post object
        return db.newEventReader()
        .from(path.collection, path.key)
        .type('comments')
        .list()
        .then(function (res) {
            item.comments = res.body.results;
            return item;
        })
        // then let's save the denormalized post
        .then(function (item) {
            var collection = ['denorm', path.collection].join('_');
            return db.put(collection, path.key, item);
        })
        .then(function () {
            return item;
        });
    });
};

// run orc-denorm's CLI
orc_denorm.cli();
// or just start the process with orc_denorm.start({ collection: '...', api_key: '...' })
```

## Error Handling

orc-denorm does its best to continue running no matter what error messages it receives from Orchestrate. For example:

* Related object is missing? That field in the denormalized item is now null, while scanning continues.
* Related object yields some other wacky error? Skip denormalizing that object, while scanning continues.
* Retrieving collection listing yields some 4xx or 5xx error? Try again!

To make sure orc-denorm really never dies, use [forever](https://github.com/nodejitsu/forever):

    forever orc-denorm -u YOUR_API_KEY -c COLLECTION

This will restart orc-denorm if it ever halts unexpectedly.

## Tests

    npm test

## License

[ASLv2](http://www.apache.org/licenses/LICENSE-2.0), yo.