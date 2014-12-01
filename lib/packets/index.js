
function ping (vars) {
  return vars;
}
ping.op = 10;

function readFirmwareHeader (vars) {
  return vars.data.toString( );
}
readFirmwareHeader.op = 11;

function readFirmwareSettings (vars) {
  return vars.data.toString( );
}
readFirmwareSettings.op = 54;

var suite = [ ping, readFirmwareSettings, readFirmwareHeader ];

function packets (message, saw) {
  var thunk = this;
  suite.forEach(function each (packet) {
    message.install.call(thunk, packet, saw);
  });

}
packets.suite = suite;
module.exports = packets;
