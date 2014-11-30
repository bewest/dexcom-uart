
var EventEmitter = require('events').EventEmitter;
var Binary = require('binary');
var chainsaw = require('chainsaw');
var message = require('./messages');

function create (master, opts) {
  var self = new EventEmitter;

  function process (command, cb) {
    var msg = message.command(command);
    console.log(msg.buffer( ));
    msg.write(master);
    message.respond.call(Binary(master))
      .tap(function (vars) {
        cb(null, vars);
    });

  }

  function ping (vars) {
    return vars;
  }
  ping.op = 10;

  function readFirmwareHeader (vars) {
    console.log("WTF", arguments);
    return vars.data.toString( );
  }
  readFirmwareHeader.op = 11;

  function readFirmwareSettings (vars) {
    console.log("WTF", arguments);
    return vars.data.toString( );
  }
  readFirmwareSettings.op = 54;

  var packets = [ ping, readFirmwareSettings, readFirmwareHeader ];
  function install (command, saw) {
    if (command.name && command.call && command.op) {
      this[command.name] = function oper (cb) {
        var bounce = this;
        console.log('sending', command.name, command.op);
        this.operate(command, function answer (err, results) {
          cb(err, command(results));
          // saw.next( );
        });
      }
    }
  }

  var api = chainsaw(function chain (saw) {
    this.process = process;
    this.operate = function operate (op, cb) {
      console.log('op', op);
      var end = saw.next;
      process(op, function handle (err, results) {
        cb.call(this, err, results);
        end( );
      });
    }
    var thunk = this;
    packets.forEach(function each (pack) {
      install.call(thunk, pack, saw);
    });
  });
  self.api = api;
  return self;
}

module.exports = create;

