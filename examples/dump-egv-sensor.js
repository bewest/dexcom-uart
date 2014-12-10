
var scan = require('../utils/scan');
var messages = require('../lib/messages');
var machine = require('../lib/');
var binary = require('binary');
var es = require('event-stream');
// var SegfaultHandler = require('segfault-handler');
// SegfaultHandler.registerHandler( );

if (!module.parent) {
  scan(function (err, list) {
    if (list.length == 1) {
      var serial = list.pop( );
        console.log('serial', serial);
        serial.open(function ( ) {
        var tx = machine(serial);
        tx.api
        .operate({op: 10 }, function (err, results) {
          console.log("OK!??!", arguments);
        })
        .ping(console.log.bind(console, 'PING'))
        .tap(function ( ) {
          console.log('can count to 5');
          var cur = 0;
          this.loop(function (end) {
            this.ping(console.log.bind(console, 'PING', cur)).tap(function ( ) {
              console.log('can count', cur);
              cur++;
            });
            if (cur > 5) {
              end( );
            }

          });
        })
        /* */
        .getEGVPageRange(function with_pages (err, range) {
          console.log("READING PAGES via stream");
          // var cur = range.end;
          var cur = range.start + 10;
          var start = cur;
          var stop = range.end;
          start = range.start;
          /*
          this.loop(function (end) {
            this
              .readEGVRecord(cur, function (err, page) {
                console.log('PAGE', cur, start-cur, page);
              })
              .tap(function ( ) {
                console.log("CURRENT", cur, cur < range.start, range);
                cur--;
                if (cur < range.start) end( );
              }) ;
          });
          */
          /*
          tx.createRangedEGVStream(this, range.start, range.start + 17)
            .pipe(es.writeArray(function (err, results) {
              console.log("PAGED STREAM RESULTS", err, results);
            }));
          */
          var stream = machine.streamify.EGV(this, start, stop);
          var now = Date.now( );
          stream.pipe(es.stringify( )).pipe(es.writeArray(function (err, results) {
            console.log("EGV STREAMED", stop - start, 'pages', "RESULTS in", (Date.now( ) - now)/1000.0, 'seconds', err, results.length);
          }));

        })
        .readSensorDataPageRange(function with_pages (err, range) {
          var stop = range.end;
          var start = range.start;
          console.log('SENSOR PAGE RANGE', range.start, range.end);
          var stream = machine.streamify.Sensor(this, start, stop);
          var now = Date.now( );
          stream.pipe(es.stringify( )).pipe(es.writeArray(function (err, results) {
            console.log("Sensor STREAMED", stop - start, 'pages', "RESULTS in", (Date.now( ) - now)/1000.0, 'seconds', err, results.length);
          }));
          // this.readSensorData(range.start, console.log.bind(console, 'SENSOR PAGE'))
        })
        /* */
        .close( );
        ;
      })
    } else {
      console.log('Quiting, found', list);
    }

  });
}

