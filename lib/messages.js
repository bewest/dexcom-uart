
var Put = require('put');
var crc = require('crc');
var consts = require('./constants');

function responder ( ) {
  return this.word8('SYNC')
  .tap(function (vars) {
    console.log('found SYNC', vars);
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
}

function command (opts) {
  opts = opts || { };
  var my = {
    SYNC: opts.sync || 0x01
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
module.exports = message;

if (!module.parent) {
  var c = command( );
  console.log();
}

