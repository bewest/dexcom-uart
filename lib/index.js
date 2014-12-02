
var EventEmitter = require('events').EventEmitter;
var Binary = require('binary');
var chainsaw = require('chainsaw');
var es = require('event-stream');
var message = require('./messages');
var packets = require('./packets');

function create (master, opts) {
  var self = new EventEmitter;
  var incoming = es.through( );
  master.pipe(incoming);

  function process (command, cb) {
    var msg = message.command(command);
    var bs = Binary(incoming);
      bs.tap(function ( ) {
        msg.write(master);
      })
      .tap(message.respond)
      .tap(function (vars) {
        cb(null, vars);
        incoming.removeAllListeners( );
    }).end( );
  }

  var api = chainsaw(function chain (saw) {
    // this.process = process;
    this.operate = function operate (op, cb) {
      // console.log('op', op);
      var end = saw.next;
      var that = this;
      process(op, function handle (err, results) {
        cb.call(that, err, results);
        setTimeout(end, 250);
      });
    }

    packets.call(this, message, saw);

    this.sleep = function sleep (n) {
      var next = saw.next( );
      setTimeout(next, n);
    }

    this.close = function close ( ) {
      master.close( );
      master.emit('end');
      self.emit('end');
      saw.next( );
    }
  });
  self.api = api;
  return self;
}

module.exports = create;

