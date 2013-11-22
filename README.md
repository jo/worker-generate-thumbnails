# Depricated!

Please use https://github.com/jo/worker-generate-thumbnails

# Worker Generate Thumbnails

This worker generates thumbnails from images
for image types supported by imagemagick.


## Prerequisites

This worker depends on `imagemagick`. Make shure the `convert` program is in the path.

## installation

    git clone git://github.com/null2/worker-generate-thumbnails.git
    cd worker-generate-thumbnails
    npm install


## Configuration

Configuration is done in a worker configuration document inside the target database.
The worker only process if there exists such a configuration file.

A Worker Configuration File might look like this:

    {
      "_id": "worker-config/generate-thumbnails",
      "_rev": "9-a653b27246b01cf9204fa9f5dee7cc64",
      "versions": {
        "thumbnail": {
          "size": "135x135"
        }
      }
    }

You can update the config live so that all future processings will take the new configuration.

Note that attachment names which starts with a version name, followed by a '/' are ignored.

_size_ is a expression for imagemagick, so you can do eg. 120x120!, 120x and so on.


## Worker Status Document

The worker stores a status document inside the target database.
The worker stores its last update seq here and can resume at the point it stopped.

    {
      "_id": "worker-status/attachments",
      "_rev": "1-1922b5623d07453a753ab6ab2c634d04",
      "last_update_seq": 34176
    }


## Document Status Object

The worker updates a status object inside the document.
This makes it supereasy to monitor worker status as well as
it keeps an atomic lock when many workers listen to the same database.
Images are prozessed only once by comparing the attachments _revpos_ property
with the revpos property of the status object.

The status object of the worker looks like this:

    "worker_status": {
      "generate-thumbnails": {
        "myfile.png": {
          "status": "completed",
          "revpos": 160
        }
      }
    }

The status field can be _triggered_, _completed_ or _error_.

The worker status is scoped by the worker name in order to have many workers
processing the same document.
The worker status is also per attachment to process only attachments which had changed.


## Running the Worker

To start, this needs the following environment variables set:

    COUCH_SERVER=http://example.org COUCH_DB=mydb npm start


## License & Copyright

(c) 2012 Johannes J. Schmidt, null2 GmbH, Berlin

Licensed under the Apache License 2.0.
