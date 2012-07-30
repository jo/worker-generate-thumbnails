// Worker Generate Thumbnails

var request = require("request");
var WorkerAttachments = require("worker-attachments");

var processor = (function() {
  var formats = ['jpg', 'png', 'gif', 'tiff', 'bmp'],
      spawn = require('child_process').spawn;

  function resize(doc, name, url, version, options, cb) {
    // let convert do the request
    var args = [url, '-thumbnail', options.size, '-'],
        convert = spawn('convert', args),
        image = [],
        imageLength = 0;

    // collect thumbnail binary
    convert.stdout.on('data', function(data) {
      image.push(data);
      imageLength += data.length;
    });

    convert.stdout.on('end', function() {
      var buffer = new Buffer(imageLength);

      for (var i = 0, len = image.length, pos = 0; i < len; i++) {
        image[i].copy(buffer, pos);
        pos += image[i].length;
      }

      // write attachment object
      doc._attachments[version + '/' + name] = {
        content_type: 'image/jpeg',
        data: buffer.toString('base64')
      };
    });

    // continue on exit
    convert.on('exit', cb);
  }

  return {
    check: function(doc, name) {
      return formats.indexOf(name.toLowerCase().replace(/^.*\.([^\.]+)$/, '$1')) > -1;
    },
    process: function(doc, name, next) {
      var cnt = 0;
      for (version in this.config.versions) cnt++;

      for (version in this.config.versions) {
        this._log(doc, 'render ' + version + '/' + name);
        resize(doc, name, this._urlFor(doc, name), version, this.config.versions[version], (function(error) {
          if (error !== 0) {
            console.warn("error in `convert`")
            this._log(doc, 'error ' + version + '/' + name);
          } else {
            this._log(doc, 'done ' + version + '/' + name);
          }
          cnt--;
          if (cnt === 0) next(null);
        }).bind(this));
      }
    }
  };
})();
  
var config = {
  server: process.env.HOODIE_SERVER || "http://127.0.0.1:5984",
  name: 'generate-thumbnails',
  config_id: 'worker-config/generate-thumbnails',
  processor: processor,
  defaults: {
    versions: {
      thumbnails: {
        size: '200x300'
      }
    }
  }
};

var workers = [];
request(config.server + "/_all_dbs", function(error, response, body) {
  if(error !== null) {
    console.warn("init error, _all_dbs: " + error);
    return;
  }

  var dbs = JSON.parse(body);
  // listen on each db.
  // Note that you have to restart the worker
  // in order to listen to newly created databases.
  dbs.forEach(function(db) {
    var worker = new WorkerAttachments(config, db);
    workers.push(worker);
  });
});
