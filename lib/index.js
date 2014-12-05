
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
        if (command.response) {
          this.tap(command.response);
        }
        cb(null, vars);
        incoming.removeAllListeners( );
    }).end( );
  }

  var api = chainsaw(function chain (saw) {
    // this.process = process;
    this.send = function send (op) {
      master.write(message.command(op).buffer( ), function written (err, stat) {
        console.log("WRITTEN", arguments);
        saw.next( );
      });
    }
    this.recv = function recv (command, cb) {
      var end = saw.next;
      var self = this;
      var bs = Binary(incoming);
      bs
        .tap(message.respond)
        .tap(function (vars) {
          if (command.response) {
            this.tap(command.response);
          }
          if (cb && cb.call) {
            cb.call(self, null, vars);
          }
          incoming.removeAllListeners( );
          end( );
        }).end( );
    }
    this.operate = function proc (oper, cb) {
      var end = saw.next;
      saw.nest(false, function ( ) {
        this.send(oper)
          .sleep(250)
          .recv(oper, cb)
          .tap(end);
      });
    }
    this.tap = function tap (cb) {
      saw.nest(cb);
    }
    this.old_operate = function operate (op, cb) {
      console.log('XXYY op', op);
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

