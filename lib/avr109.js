var AVR109 = require('chip.avr.avr109');
var colors = require('colors');
var tools = require('./tools');
var Serialport = require('browser-serialport');
var async = require('async');
var Protocol = require('./protocol');
var util = require('util');
var os = require('os');

var Avr109 = function(options) {
  options.protocol = function() { return AVR109; };

  Protocol.call(this, options);
};

util.inherits(Avr109, Protocol);

/**
 * Uploads the provided hex file to the board, via the AVR109 protocol
 *
 * @param {string} hex - path of hex file for uploading
 * @param {function} callback - function to run upon completion/error
 */
Avr109.prototype._upload = function(file, callback) {
  var _this = this;
  var data;

  tools._grabFile(file, function(err, data) {
      if (err) {
          return callback(err);
      }

      _this._reset(function(error) {
        if (error) { return callback(error); }

        _this.debug('reset complete.');

        _this.connection.serialPort.open(function(error) {
          if (error) { return callback(error); }

          _this.debug('connected');

          _this._write(data, function(error) {
            var color = (error ? colors.red : colors.green);
            _this.debug(color('flash complete.'));

            // Can't close the serialport on avr109 boards >> node-serialport/issues/415
            // _this.serialPort.close();

            return callback(error);
          });
        });
      });
  });
};

/**
 * Performs the writing part of uploading to an AVR109 bootloaded chip
 *
 * @param {buffer} data - hex buffer to write to the chip
 * @param {function} callback - function to run upon completion/error
 */
Avr109.prototype._write = function(data, callback) {
  var _this = this;

  var options = {
    signature: _this.board.signature.toString(),
    debug: false
  };

  _this.chip.init(_this.connection.serialPort, options, function(error, flasher) {
    if (error) { return callback(error); }

    _this.debug('flashing, please wait...');

    async.series([
      flasher.erase.bind(flasher),
      flasher.program.bind(flasher, data.toString()),
      function verify(done) {
        // please see noopkat/avrgirl-arduino/issues/45 on github
        if (os.platform() !== 'linux') {
          flasher.verify(done);
        } else {
          done();
        }
      },

      flasher.fuseCheck.bind(flasher)
    ],
    function(error) {
      return callback(error);
    });
  });
};

/**
 * Software resets an Arduino AVR109 bootloaded chip into bootloader mode
 *
 * @param {function} callback - function to run upon completion/error
 */
Avr109.prototype._reset = function(callback) {
  var _this = this;
  var delay = 500;
  var conn;

  // creating a temporary connection for resetting only
  var tempSerialPort = new Serialport.SerialPort(_this.connection.options.port, {
    baudRate: 1200,
  }, false);

  _this.connection.serialPort = tempSerialPort;
  conn = _this.connection;

  _this.debug('resetting board...');

  async.series([
    tempSerialPort.open.bind(tempSerialPort),
    conn._cycleDTR.bind(conn),
    conn._setUpSerial.bind(conn),
    conn._pollForPort.bind(conn)
  ],
  function(error) {
    // some leos are just plain tardy
    setTimeout(function() {
      return callback(error);
    }, delay);
  });
};

module.exports = Avr109;
