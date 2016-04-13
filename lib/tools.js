var request = require('browser-request');
var intelhex = require('intel-hex');

var tools = {};

/**
 * Opens and parses a given hex file
 */
tools._parseHex = function(file, callback) {
    this._grabFile(file, function(err, data) {
        if (err) {
            return callback(err);
        }

        try {
          return callback(null, intelhex.parse(data).data);
        } catch (error) {
          return callback(error);
        }
    });
};

tools._grabFile = function(url, callback) {
    request(url, function(err, response, body) {
        if (err) {
            return callback(err);
        }

        callback(null, body);
    });
};

module.exports = tools;
