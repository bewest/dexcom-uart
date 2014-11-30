
var es = require('event-stream');
var EventEmitter = require('events').EventEmitter;
var Binary = require('binary');
var message = require('./messages');
var chainsaw = require('chainsaw');

function create (master, opts) {
  var stream = es.through( );
  var self = new EventEmitter;
  var bs = Binary(master);
  // master.pipe(bs);
  function prelude (op, next) {
    var msg = message.command(op);
    next(null, {command: msg});
  }

  function iter (item, next) {
    // item.respond.call(master)
    item.command.write(master);
    message.respond.call(Binary(master))
      .tap(function (vars) {
        console.log('found REQUESTED RESPONSE', vars);
        // command.data = vars;
        item.data = vars;
        next(null, item);
      })
    ;
  }

  function finish (item, next) {
  }

  function process (command, cb) {
    /*
    core.write(command);
    */
    var msg = message.command(command);
    msg.write(master);
    message.respond.call(Binary(master))
      .tap(function (vars) {
        cb(null, vars);
    });

  }

  // var core = es.pipeline(es.map(prelude), es.map(iter), es.map(finish));
  var api = chainsaw(function (saw) {
    this.process = process;
    this.operate = function operate (op, cb) {
      console.log('op', op);
      var end = saw.next;
      process(op, function (err, results) {
        cb(err, results);
        end( );
      });
    }
  });
  self.api = api;
  return self;
}

module.exports = create;

