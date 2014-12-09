
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

  self.createRangedEGVStream = function createRanged (frame, start, stop) {
    var cur = stop;
    var stream = es.through( );
    frame
      .tap(function ( ) {
      this.loop(function (end) {
        console.log("EACH PAGE", cur, start, stop, arguments);
        console.log('ASKING FOR PAGE', cur);
        this.readEGVPage(cur, function onPage (err, page) {
          console.log('got page writing', err, page.json.length, 'entries');
          var json = page.json.slice( );
          json.reverse( );
          json.forEach(function (el) { stream.write(el) });
          this.tap(function ( ) {
            console.log('should quit?', cur < start);
            if (cur < start) { console.log("QUITTING XXX"); end( );  stream.end( ); return; }
            cur--;
            console.log('asking for another', cur, start, stop);
          });
        })
        ;
      });
    })
    return stream;
  };

  var api = chainsaw(function chain (saw) {
    // this.process = process;
    this.send = function send (op) {
      master.write(message.command(op).buffer( ), function written (err, stat) {
        console.log("WRITTEN", arguments);
        saw.next( );
      });
    }
    this.recv = function recv (command, cb) {
      var self = this;
      var bs = Binary(incoming);
        bs
          .tap(message.respond)
          .tap(function (vars) {
            if (command.response) {
              this.tap(command.response);
            }
            if (cb && cb.call) {
              // cb.call(self, null, vars);
              saw.nest(cb, null, vars);
            }
            incoming.removeAllListeners( );
            // end( );
            // saw.next( );
          }).end( );
      // saw.nest(false, function ( ) { });
    }
    this.operate = function proc (oper, cb) {
      // var end = saw.next;
      saw.nest(false, function ( ) {
        this.send(oper)
          .recv(oper, cb)
          .sleep(250)
          // .tap(end)
          .tap(saw.next)
          ;
      });
    }
    this.tap = function tap (cb) {
      saw.nest(cb);
    }
    this.loop = function wrap_loop (cb) {
      var end = false;
      saw.nest(false, function looper ( ) {
        cb.call(this, function fin ( ) {
          end = true;
        });
        this.tap(function ( ) {
          if (end) saw.next( );
          else looper.call(this);
        });
      });
    };
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
      var now = Date.now( );
      console.log('sleeping', now - now);
      function next ( ) {
        console.log('resuming', Date.now( ) - now);
        saw.next( );
      }
      setTimeout(next, n);
    }

    this.close = function close ( ) {
      if ('close' in master) {
        master.close( );
      }
      if ('end' in master) {
        master.end( );
      }
      master.emit('end');
      self.emit('end');
      saw.next( );
    }
  });
  self.api = api;
  return self;
}

module.exports = create;

