
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

function readHardwareBoard (vars) {
  return vars.data.toString( );
}
readHardwareBoard.op = 49;



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
  , readHardwareBoard
  , require('./database-partitions')
  , ReadDatabasePageRange
  , ReadPageHeader
  , ReadPage
];

function PageHead (vars) {
  // var head_length = 32;
  // var head_length = 28;
  // var head_length = 30;
  var head_length = 28;
  var page = binary.parse(vars.data)
    .word32le('index')
    .word32le('numrec')
    .word8('type')
    .word8('revision')
    .word32le('pageNumber')
    .word32le('r2')
    .word32le('r3')
    .word32le('r4')
    .word16le('headCRC')
    .buffer('data', vars.size - head_length)
    .word16le('pageCRC')
    .buffer('remainder', 1024)
    ;
  vars.head = page.vars;
  // vars.page = page;
  return vars
}

function iter (vars) {
  var type = vars.head.type;
  var raw = vars.head.data;
  var bs = binary.parse(vars.head.data);
  var list = [ ];
  if (iter.record[type] && iter.record[type].call) {
    var decoder = iter.record[type];
    vars.head.correctPacketLength = vars.head.numrec * decoder.expected;

    function validate ( ) {
      if (decoder && decoder.json) {
        this.tap(decoder.json);
      }
    }
    function save (V) {
      if (V.record.system_time) {
        list.push(V.record);
        delete V.record;
      } else {
        // console.log("BAD", V.record);
      }
    }

    function each (end, i) {
      // console.log('each', i, vars, arguments);
      // TODO: quick hack, revisit
      if (list.length > vars.head.numrec) {
        end( );
        return;
      }
      this.into('record', function (rec) {
        decoder.call(this, vars);
        if (rec.system_time) {
          validate.call(this);
        } else {
          end( );
          return;
        }
      }).tap(save);
      ;

    }
    
    function payload ( ) {
      var data = raw.slice(0);
      vars.head.extra = new Buffer('');
      if (vars.head.correctPacketLength && vars.head.correctPacketLength <= data.length) {
        vars.head.extra = data.slice(vars.head.correctPacketLength);
        data = data.slice(0, vars.head.correctPacketLength);
      }
      vars.head.expected = (data.length) / decoder.expected;
      vars.head.recSize = data.length / (vars.head.numrec)
      var bs = binary.parse(data);
      return bs;
    }

    function decode ( ) {
      var parsed = payload( ).loop(each).vars;
      return list;
    }
    return decode;
  }
}

iter.record = {4: EGVRecord };
iter.register = function register (Type) {
  iter.record[Type.type] = Type;
}

function EGVRecord (head) {
  return this
    .word32le('system_time')
    .word32le('display_time')
    .word16le('full_glucose')
    .word8('full_trend')
    .word16le('crc')
    ;
}
EGVRecord.expected = 13;
function fill (name, ch) {
  this.loop(function (end, vars) {
    this.word8(name)
      .tap(function (V) {
        if (V[name] != ch) {
          end( );
        }
      })
      ;
  });
}

function SensorData (head) {
  return this
    .word32le('system_time')
    .word32le('display_time')
    .word32le('unfiltered')
    .word32le('filtered')
    .word16le('rssi')
    .word16le('crc')
    .tap(function (rec) {
      rec.system = ReceiverTime(rec.system_time);
      rec.display = ReceiverTime(rec.display_time);
    })
    ;
}
SensorData.type = 3;
SensorData.expected = 20;

function describe_page (op, Type) {
  Type.type = op;
  iter.register(Type);
}
function XMLPage (head) {
  return this
    .word32le('system_time')
    .word32le('display_time')
    .scan('xml', new Buffer([ 0x00, 0x00]))
    // .word32le('null')
    .scan('extra', new Buffer([ 0xff, 0xff ]))
    .tap(function (rec) {
      rec.xml = rec.xml.toString( );
      rec.system = ReceiverTime(rec.system_time);
      rec.display = ReceiverTime(rec.display_time);
    }).vars;
}
describe_page(0, function ManufacturingData ( ) {
  XMLPage.apply(this, arguments);
});

describe_page(1, function FirmwareParameterData ( ) {
  XMLPage.apply(this, arguments);
});

describe_page(2, function PCParameterData ( ) {
  XMLPage.apply(this, arguments);
});

describe_page(3, SensorData);
function ReceiverTime (ts) {
  var base = Date.parse('2009-01-01T00:00:00-0800');
  return new Date(base + (ts * 1000));
}

EGVRecord.type = 4;

describe_page(5, function CalSet ( ) {
});

describe_page(6, function Deviations ( ) {
});

describe_page(7, function Insertions ( ) {
});

describe_page(8, function ReceiverLog ( ) {
});

describe_page(9, function ReceiverErrror ( ) {
});

describe_page(10, function Meter ( ) {
});

describe_page(11, function UserEvent ( ) {
});

describe_page(12, function UserSettings ( ) {
});

EGVRecord.consts = {
  VALUE_MASK: 1023
, DISPLAY_ONLY_MASK: 32768
, TREND_ARROW_MASK: 15
, NOISE_MASK: 0x70
};
EGVRecord.json = function (rec) {
  rec.glucose = rec.full_glucose & EGVRecord.consts.VALUE_MASK;
  rec.display_only = rec.full_glucose & EGVRecord.consts.DISPLAY_ONLY_MASK;
  rec.trend_arrow = rec.full_trend & EGVRecord.consts.TREND_ARROW_MASK;
  rec.noise = (rec.full_trend & EGVRecord.consts.NOISE_MASK) >> 4;
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

function install_page (Page) {
  var name = 'read' + Page.name;
  this[name] = function readKnownPage (page, cb) {
    this.ReadPage({type: Page.type, page: page}, cb);
  };

  var pager = name + 'PageRange';
  this[pager] = function readKnownPageRange (cb) {
    this.ReadDatabasePageRange({type: Page.type}, cb);
  };

  /*
  this['create' + Page.name + 'Stream'] = function readKnownStream (start, stop) {
    var cur = stop;
    this.stream(function (stream) {
      console.log('creating stream');
      this.loop(function (end) {
        console.log("EACH PAGE", cur, start, stop, arguments);
        console.log('ASKING FOR PAGE', cur);
        this.readEGVPage(cur, function onPage (err, page) {
          console.log('got page writing', err, page.json.length, 'entries');
          page.json.forEach(function (el) { stream.write(el) });
          cur--;
          if (cur < start) { console.log("QUITTING XXX"); end( );  stream.end( ); return; }
        })
        ;
      });
    });
    return stream;
  };
  */

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

  this.ManufacturingData = function (page, cb) {
    this.ReadPage({type: 0, page: page}, cb);
  }
  
  var cur;
  for (var x in iter.record) {
    cur = iter.record[x];
    install_page.call(this, cur);
  }

}
packets.iter = iter;
packets.suite = suite;
module.exports = packets;
