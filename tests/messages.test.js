
describe('messages', function ( ) {

  var message = require('../lib/messages');
  it('should format messages', function ( ) {
    message.should.be.ok;
    message.command( )
      .buffer( )
      .toString('hex')
      .should.eql('0106000a5e65')
      ;
    message.command({op: 10})
      .buffer( )
      .toString('hex')
      .should.eql('0106000a5e65')
      ;
    message.command({op: 0x10})
      .buffer( )
      .toString('hex')
      .should.eql('0106001025d6')
      ;

    message.command({op: 0x10, payload: new Buffer([0xAA, 0xBB])})
      .buffer( )
      .toString('hex')
      .should.eql('01080010aabbebe0')
      ;

  });
  it('should parse messages', function (done) {
    var binary = require('binary');
    binary.parse(message.command({op: 0x10, payload: new Buffer([0xAA, 0xBB])})
      .buffer( ))
      .tap(message.respond)
      .tap(function (vars) {
        vars.SYNC.should.eql(1);
        vars.op.should.eql(0x10);
        vars.data.length.should.eql(2);
        vars.data.toString('hex').should.eql('aabb');
        done( );
      });
      ;
  });
  describe('should create instances', function ( ) {
    var binary = require('binary');
    function valid_ping (vars) {
        vars.should.be.ok;
        vars.total.should.eql(6);
        vars.crc.ok.should.be.true;
        vars.data.toString( ).should.eql('');
        vars.crc.observed.should.eql(vars.crc.expected);
    }
    function Ping (vars) {
      valid_ping(vars);
      return vars;
    }
    Ping.op = 10;
    function valid_instance(Command) {
      var msg = message(Ping);
      it(Command.name + 'is valid instance', function ( ) {
        msg.should.be.ok;
        msg.decode.call.should.be.ok;
        msg.name.should.eql('Ping');
      });

      return msg;
    }
    var msg = valid_instance(Ping);
    function parses_itself (name, buffer, msg) {
      var parsed =  binary.parse(buffer);
      it(name + ' parses itself', function ( ) {
          parsed = parsed.tap(message.respond)
            .tap(function (vars) {
              msg.decode(vars);
            });
      });
      return parsed;
    }
    var response = parses_itself(Ping.name, message.command({op: 0x01}).buffer( ), msg);
    function checks_ok (name, response, checks) {
      it(name + 'is ok response', function ( ) {
        response.tap(checks);
      });
    }

    checks_ok(Ping.name, response, valid_ping);

    /*
    it('ping is empty', function ( ) {
      binary.parse(message.command({op: 0x01}).buffer( ))
        .tap(message.respond)
        .tap(function (vars) {
          msg.decode(vars);
        });
    });
    */
    var ctx = { };
    function operate (msg, cb) {
    }
    ctx.operate = operate;
    function is_installable (Command) {
      it(Command.name + 'should install', function ( ) {
        message.install.call(ctx, Command);
        ctx.Ping.call.should.be.ok;
        
      });
    }
    is_installable(Ping);
  });

});

