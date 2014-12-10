var es = require('event-stream');

function streamifyRanged (pager) {
  function streamered (frame, start, stop) {
    var stream = es.through( );
    var cur = stop;
    frame.tap(function ( ) {
      this.loop(function (end) {
        this[pager](cur, function onPage (err, page) {
          var json = page.json.slice( );
          json.reverse( );
          json.forEach(function (el) { stream.write(el) });
          this.tap(function ( ) {
            console.log('should quit?', cur < start);
            if (cur < start) { console.log("QUITTING XXX"); end( );  stream.end( ); return; }
            cur--;
            console.log('asking for another', cur, start, stop);
          });
        });
      });
    });

    return stream;
  }
  return streamered
}

streamifyRanged.EGV = streamifyRanged('readEGVRecord');
streamifyRanged.Sensor = streamifyRanged('readSensorData');
streamifyRanged.CalSet = streamifyRanged('readCalSet');
streamifyRanged.Deviations = streamifyRanged('Deviations');
streamifyRanged.Insertions = streamifyRanged('Insertions');
streamifyRanged.ReceiverLog = streamifyRanged('ReceiverLog');
streamifyRanged.ReceiverError = streamifyRanged('ReceiverError');
streamifyRanged.Meter = streamifyRanged('Meter');
streamifyRanged.UserEvent = streamifyRanged('UserEvent');
streamifyRanged.UserSettings = streamifyRanged('UserSettings');
module.exports = streamifyRanged;
