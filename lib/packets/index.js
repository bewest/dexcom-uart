
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


var binary = require('binary');
var put = require('put');
function ReadDatabasePageRange (vars) {
  console.log(vars);
  return binary.parse(vars.data)
    .word32lu('start')
    .word32lu('end')
    .vars
    ;
}

ReadDatabasePageRange.params = function (opts) {
  return put( )
    .word8(opts.type)
    .buffer( )
    ;
};
ReadDatabasePageRange.op = 16


function ReadPage (vars) {
  vars = PageHead(vars);
  vars.bytes = vars.data.length;
  var handler = iter(vars);
  if (handler && handler.call) {
    vars.json = handler( );
    vars.found = vars.json.length;
  }
  return vars;
}
ReadPage.params = function (opts) {
  return put( )
    .word8(opts.type)
    .word32le(opts.page || 0)
    .word8(1)
    .buffer( )
    ;
}
ReadPage.op = 17

function ReadPageHeader (vars) {
  return PageHead(vars);
}
ReadPageHeader.params = function (opts) {
  return put( )
    .word8(opts.type)
    .word32le(opts.page || 0)
    .word8(1)
    .buffer( )
    ;
}
ReadPageHeader.op = 18


var suite = [ ping
  , readFirmwareSettings
  , readFirmwareHeader
  , require('./database-partitions')
  , ReadDatabasePageRange
  , ReadPageHeader
  , ReadPage
];

function PageHead (vars) {
  var head_length = 32;
  var page = binary.parse(vars.data)
    .word32le('index')
    .word32le('numrec')
    .word8('type')
    .word8('revision')
    .word32le('pages')
    .word32le('r1')
    .word32le('r2')
    .word32le('r3')
    .word16le('crc')
    .buffer('data', vars.size - head_length - 2)
    .word16le('pageCRC')
    .buffer('remainder', 1024)
    ;
  vars.head = page.vars;
  // vars.page = page;
  return vars
}
function iter (vars) {
  var type = vars.head.type;
  var bs = binary.parse(vars.head.data);
  vars.head.expected = vars.head.data.length / 13;
  var list = [ ];
  if (iter.record[type] && iter.record[type].call) {
    var decoder = iter.record[type];

    function validate ( ) {
      if (decoder && decoder.json) {
        this.tap(decoder.json);
      }
    }
    function save (V) {
      console.log("HELLO", list.length, V);
      if (V.record.system_time) {
        list.push(V.record);
        delete V.record;
      }
    }

    function each (end, i) {
      console.log('each', i, vars, arguments);
      this.into('record', function (rec) {
        decoder.call(this, vars);
        if (rec.system_time) {
          validate.call(this);
        } else {
          console.log('XXX ENDING')
          end( );
          return;
        }
      // })
      }).tap(save);
      ;

    }

    function decode ( ) {
      var parsed = bs.loop(each).vars;
      return list;
    }
    return decode;
  }
}

iter.record = {4: EGVRecord };

function EGVRecord (head) {
  return this
    .word32le('system_time')
    .word32le('display_time')
    .word16le('full_glucose')
    .word8('full_trend')
    .word16le('crc')
    ;
}

function ReceiverTime (ts) {
  var base = Date.parse('2009-01-01T00:00:00-0800');
  var orig = new Date(ts * 1000);
  var delta = base - orig.getTime( );

  return new Date(base + (ts * 1000));
}

EGVRecord.type = 4;

EGVRecord.consts = {
  VALUE_MASK: 1023
, DISPLAY_ONLY_MASK: 32768
, TREND_ARROW_MASK: 15
};
EGVRecord.json = function (rec) {
  rec.glucose = rec.full_glucose & EGVRecord.consts.VALUE_MASK;
  rec.display_only = rec.full_glucose & EGVRecord.consts.DISPLAY_ONLY_MASK;
  rec.trend_arrow = rec.full_trend & EGVRecord.consts.TREND_ARROW_MASK;
  rec.noise = (rec.full_trend >> 4) & EGVRecord.consts.TREND_ARROW_MASK;
  rec.system = ReceiverTime(rec.system_time);
  rec.display = ReceiverTime(rec.display_time);
}

function EventRecord (head) {
  return this
    .word32le('system_time')
    .word32le('display_time')
    .word8('event_type')
    .word8('event_subtype')
    .word32le('display_time')
    .word32le('event_value')
    .word16le('crc')
    ;
}


function packets (message, saw) {
  var thunk = this;
  suite.forEach(function each (packet) {
    message.install.call(thunk, packet, saw);
  });
  this.getSensorPageRange = function (cb) {
    this.ReadDatabasePageRange({type: 3}, cb);
  }
  this.getEGVPageRange = function (cb) {
    this.ReadDatabasePageRange({type: 4}, cb);
  }
  this.getReceiverLogPageRange = function (cb) {
    this.ReadDatabasePageRange({type: 8}, cb);
  }

  this.readEGVPage = function (page, cb) {
    this.ReadPage({type: 4, page: page}, cb);
  }

}
packets.suite = suite;
module.exports = packets;
