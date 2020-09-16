// var Parser = require("binary-parser").Parser;
const data = Buffer.from('08fe40f0135401a36dce46', 'hex');
var packet = require('packet');
var parser = packet.createParser();
var serializer = parser.createSerializer();

// const extract = promisify(parser.extract)

parser.packet("objectLocator", `
b8{x3, b1 => isGNSSError, b1 => isGNSSFix, x1, b1 => isMovingMode, b1 => isButtonTriggered },
b8{b4 => batteryLevel, b4 => voltage},
b8{x1, b7 => temperature},
l32{x4, -b28 => lat},
l32{b3 => acc, -b29 => lon}
`);

parser.packet("temperature_humidity_cmd", `
b8 => keepAliveCmd,
l16 => keepAliveConfig,
b8 => dectectItvlCmd,
l16 => dectectItvlConfig,
b8 => tempTriggerCmd,
b8 => tempTriggerConfig,
b8 => rhTriggerCmd,
b8 => rhTriggerConfig
`);

parser.extract("objectLocator", function (parsedPayload) {
    // console.log(parsedPayload);
    parsedPayload.voltage = (25 + parsedPayload.voltage) / 10;
    parsedPayload.batteryLevel = 100 * (parsedPayload.batteryLevel / 15);
    parsedPayload.temperature = parsedPayload.temperature - 32;
    parsedPayload.lat = parsedPayload.lat / 1000000;
    parsedPayload.lon = (parsedPayload.lon / 1000000);
    parsedPayload.acc = 2 ** (parsedPayload.acc + 2);
    console.log(parsedPayload);
});
parser.parse(data);

serializer.serialize('temperature_humidity_cmd', {
    keepAliveCmd: 0,
    keepAliveConfig: 3600,
    dectectItvlCmd: 1,
    dectectItvlConfig: 60,
    tempTriggerCmd: 2, 
    tempTriggerConfig: 2,
    rhTriggerCmd: 3,
    rhTriggerConfig: 5
})
var buf = new Buffer.alloc(serializer.sizeOf)
serializer.write(buf);
console.log(buf.toString('hex'));