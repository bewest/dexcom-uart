
var Serial = require('serialport');

function scan (pattern, cb) {
  if (!cb) { cb = pattern; pattern = 'DexCom_Gen4_USB'; }
  var opt = {baudRate: 115200};
  Serial.list(scanned);
  function scanned (err, list) {
    var candidates = list.map(function (el) {
      if (el && el.pnpId) {
        if (el.pnpId.match(pattern)) {
          return new Serial.SerialPort(el.comName, opt);
        }
      }
    });
    cb(null, candidates);
  }
}

module.exports = scan;

