// Worker Attachments
var request = require("request");

var WorkerAttachments = require("worker-attachments");

// example mimimal worker that checks every jpg or png image
var processor = (function() {
  var formats = ['jpg', 'png'],
      spawn = require('child_process').spawn;

  return {
    check: function(doc, name) {
      return formats.indexOf(name.toLowerCase().replace(/^.*\.([^\.]+)$/, '$1')) > -1;
    },
    process: function(doc, name, next) {
      var args = [this._urlFor(doc, name), '-thumbnail', this.config.size, '-'],
          convert = spawn('convert', args),
          image = [],
          imageLength = 0;

      this._log(doc, 'convert ' + name);

      convert.stdout.on('data', function(data) {
        image.push(data);
        imageLength += data.length;
      });

      convert.stdout.on('end', (function() {
        var buffer = new Buffer(imageLength);

        for (var i = 0, len = image.length, pos = 0; i < len; i++) {
          image[i].copy(buffer, pos);
          pos += image[i].length;
        }

        doc._attachments[this.config.folder + '/' + name] = {
          content_type: 'image/jpeg',
          data: buffer.toString('base64')
        };
      }).bind(this));

      convert.on('exit', (function(code) {
        if (code !== 0) {
          console.warn("error in `convert`")
          this._log(doc, 'error ' + name);
        } else {
          this._log(doc, 'done ' + name);
        }
        
        next(code);
      }).bind(this));
    }
  };
})();
  
var config = {
  server: process.env.HOODIE_SERVER || "http://127.0.0.1:5984",
  name: 'generate-thumbnails',
  config_id: 'worker-config/generate-thumbnails',
  processor: processor,
  defaults: {
    folder: 'thumbnails',
    size: '200x300'
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
