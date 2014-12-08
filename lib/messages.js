
var Put = require('put');
var crc = require('crc');
var EventEmitter = require('events').EventEmitter;
var consts = require('./constants');

function responder ( ) {
  return this.word8('SYNC')
  .tap(function (vars) {
    // console.log('found SYNC', vars);
    if (vars.SYNC == 0x01) {
      this
        .word16le('total')
        .tap(function (vars){
          vars.size = vars.total - 6;
        })
        .word8('op')
        .buffer('data', 'size')
        .tap(function (vars) {
          this
            .into('crc', function (check) {
              this
              .word16le('observed')
              var msg = Put( )
                .word8(vars.SYNC)
                .word16le(vars.total)
                .word8(vars.op)
                .put(vars.data)
                ;
              check.expected = crc.crc16ccitt(msg.buffer( ), 0);
            })
            ;
        })
        .tap(function check (vars) {
          vars.crc.ok = vars.crc.expected == vars.crc.observed;
        })
        ;
    }
  })
  ;

}
function message (opts) {
  var self = new EventEmitter;
  self.opts = opts;
  self.op = opts.op;
  self.name = opts.name;
  self.params = function params (input) {
    if (opts.params && opts.params.call) {
      return opts.params.apply(self, arguments);
    }
    return new Buffer('');
  };

  if(opts && opts.call) {
    self.decode = opts;
  }
  return self;
}

function install (command, saw) {
  if (command.name && command.call && command.op) {
    var msg = message(command);
    this[command.name] = function oper (cb) {
      var args = [ ].slice.call(arguments);
      cb = args.pop( );
      msg.payload = msg.params.apply(msg, args);
      console.log('sending', command.name, command.op);
      this.operate(msg, function answer (err, results) {
        cb.call(this, err, msg.decode(results));
        // saw.next( );
      });
    }
  }
}

function command (opts) {
  opts = opts || { };
  var my = {
    SYNC: ('sync' in opts) ? opts.sync : 0x01
  , payload: opts.payload || new Buffer('')
  , op: opts.op || 10
  };
  var msg = Put( )
    .word8(my.SYNC)
    .word16le(my.payload.length + 6)
    .word8(my.op)
    .put(my.payload)
    ;
  msg.word16le(crc.crc16ccitt(msg.buffer( ), 0));
  return msg;
}

message.respond = responder;
message.command = command;
message.install = install;
module.exports = message;

if (!module.parent) {
  var c = command( );
  console.log();
}

