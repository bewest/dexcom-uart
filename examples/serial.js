
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
        /*
        var bs = binary(serial);
        bs.loop(function (end) {
          messages.command( ).write(serial);
          this.buffer('foo', 6)
          .tap(function (vars) {
            console.log("FOO", vars);
          });
        });
        */
        var tx = machine(serial);
        tx.api
        .operate({op: 10 }, function (err, results) {
          console.log("OK!??!", arguments);
        })
        /*
        .operate({op: 49}, function (err, results) {
          console.log("HARDWARE ID", arguments);
        })
        .operate({op: 11}, function (err, results) {
          console.log("FIRMWARE HEADER", arguments, results.data.toString( ));
        })
        .operate({op: 54}, function (err, results) {
          console.log("FIRMWARE SETTINGS", results.data.toString( ));
        })
        */
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
        // .readFirmwareSettings(console.log.bind(console, 'readFirmwareSettings'))
        // .readFirmwareHeader(console.log.bind(console, 'readFirmwareHeader'))
        /*
        .ReadDatabasePartitions(console.log.bind(console, 'ReadDatabasePartitions'))
        .ReadDatabasePageRange({type: 4 }, console.log.bind(console, 'PageRange'))
        .getSensorPageRange(console.log.bind(console, 'Sensor pages'))
        .getReceiverLogPageRange(console.log.bind(console, 'Receiver Log pages'))
        */
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
        /*
        .readManufacturingData(0, console.log.bind(console, 'MANUFACTURING DATA 111'))
        .readFirmwareParameterData(0, console.log.bind(console, 'FirmwareParameterData'))
        */
        // .readPCParameterData(0, console.log.bind(console, 'PCParameterData'))
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
        /*
        */
        .close( );
        ;
      })
    } else {
      console.log('Quiting, found', list);
    }

  });
}

