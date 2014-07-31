# orc-denorm

Denormalize Orchestrate items in the background.

## Install

To get orc-denorm, you'll need [node.js](). Once you've got that installed, install orc-denorm like this:

    npm install -g orc-denorm

That gives you access to orc-denorm's CLI. To install orc-denorm as a dependency of another project, install like this:

    npm install orc-denorm

## Usage

To run orc-denorm with just the default settings, do this:

    orc-denorm -u YOUR_API_KEY -c COLLECTION

This will examine every item in `COLLECTION` for fields named like `[collection]_key`, use their value to find the item they refer to, and create a new document in `denorm_COLLECTION` where those `[collection]_key` fields have been changed to include the whole item they refer to, rather than just its key. So, for example, this document from a `likes` collection:

    {
        user_id: '...',
        post_id: '...'
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

With the same key as the original, but in the `denorm_likes` collection.

### Customization

To customize how orc-denorm handles documents, you can write your own script:

``` javascript
var orc_denorm = require('orc-denorm');

// the custom denormalization function
// must return a promise
orc_denorm.denormalize = function (db, path, item) {
    // db is an authenticated orchestrate.js client
    // path == { collection: '...', key: '...', ref: '...'}
    // item == { /* the item's value */ }

    // let's run the default denormalization function first
    return this.denormalize(db, path, item)
    .then(function (item) {
        // then let's add a post's comments to the post object
        return db.newEventReader()
        .from(path.collection, path.key)
        .type('comments')
        .list()
        .then(function (res) {
            item.comments = res.results;
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
orc_denorm.bin();
// or just start the process with orc_denorm.start({ collection: '...', api_key: '...' })
```

## Tests

    npm test

## License

[ASLv2](http://www.apache.org/licenses/LICENSE-2.0), yo.