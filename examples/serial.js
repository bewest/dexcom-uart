
var scan = require('../utils/scan');
var messages = require('../lib/messages');
var machine = require('../lib/');
var binary = require('binary');
var SegfaultHandler = require('segfault-handler');
SegfaultHandler.registerHandler( );

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
        .readFirmwareSettings(console.log.bind(console, 'readFirmwareSettings'))
        .readFirmwareHeader(console.log.bind(console, 'readFirmwareHeader'))
        .ReadDatabasePartitions(console.log.bind(console, 'ReadDatabasePartitions'))
        .ReadDatabasePageRange({type: 4 }, console.log.bind(console, 'PageRange'))
        /*
        .getSensorPageRange(console.log.bind(console, 'Sensor pages'))
        .getReceiverLogPageRange(console.log.bind(console, 'Receiver Log pages'))
        */
        .getEGVPageRange(function with_pages (err, range) {
          this.readEGVPage(range.start, console.log.bind(console, 'EGV HISTORY'))
        })
        .readManufacturingData(0, console.log.bind(console, 'MANUFACTURING DATA 111'))
        .readFirmwareParameterData(0, console.log.bind(console, 'FirmwareParameterData'))
        .readPCParameterData(0, console.log.bind(console, 'PCParameterData'))
        .readSensorDataPageRange(function with_pages (err, range) {
          console.log('SENSOR PAGE RANGE', range.start, range.end);
          this.readSensorData(range.start, console.log.bind(console, 'SENSOR PAGE'))
        })
        .close( );
        ;
      })
    } else {
      console.log('Quiting, found', list);
    }

  });
}

