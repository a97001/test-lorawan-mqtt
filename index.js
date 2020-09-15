var mosca = require('mosca');
var Parser = require("binary-parser").Parser;
const bitwise = require('bitwise');
const BitArray = require('node-bitarray');
var bb = require("bit-buffer");
// bb.bigEndian = true;
var downlinkTopic = "GIOT-GW/DL/000080029c601e41";
var downlinkClientId = "";

const fs = require('fs');

const objectLocatorPattern = new Parser()
    .endianess('little')
    .bit1('isButtonTriggered')
    .bit1('isMovingMode')
    .seek(1)
    .bit1('isGNSSFix')
    .bit1('isGNSSError')
    .seek(1)
    .bit4('voltage')
    .bit4('batteryLevel')
    .bit7('temperature')
    .seek(1)
    .bit28('lat')
    .seek(4)
    .bit29('lon')
    .bit3('acc');

const temperatureHumidityPattern = new Parser()
    .endianess('little')
    .seek(3)
    .bit1('isIAQ')
    .seek(4)
    .bit4('voltage')
    .seek(4)
    .bit7('temperature')
    .seek(1)
    .bit7('humidity')
    .seek(1);
    010b3a00003a0700
const motionPIRPattern = new Parser()
    .endianess('little')
    .bit1('$1')
    .bit1('$2')
    .bit1('$3')
    .bit1('$4')
    .bit1('$5')
    .bit1('$6')
    .bit1('$7')
    .bit1('$8')
    .bit1('$9')
    .bit1('$10')
    .bit1('$11')
    .bit1('$12')
    .bit1('$13')
    .bit1('$14')
    .bit1('$15')
    .bit1('$16')
    .bit1('$17')
    .bit1('$18')
    .bit1('$19')
    .bit1('$20')
    // .bit1('isOccupied')
    // .bit7('skip')
    // .bit4('voltage')
    // .bit4('skip1')
    // .bit16('timeEsp')
    // .bit24('counter')
    // .bit24('counter')
    // // .bit16('timeEsp')
    // .seek(4)
    
    // .bit1('o')
    // .bit7('temperature')
    
    
    // .seek(1)
    // .bit1('isOccupied')
    // .seek(7)
    // .bit4('voltage')
    // .seek(4)
    // .bit7('temperature')
    // .seek(1)
    // .seek(16)
    // .bit24('counter')
    

    // .bit24('counter')

var settings = {
    port: 1883
    //   backend: ascoltatore
};

var server = new mosca.Server(settings);

server.on('clientConnected', function (client) {
    console.log('client connected', client.id);
});

// fired when a message is received
server.on('published', function (packet, client) {
    // console.log('Published', packet.payload);
    if (client && client.id === downlinkClientId) {
        var message = {
            topic: downlinkTopic,
            payload: packet.payload, // or a Buffer
            qos: 0, // 0, 1, or 2
            retain: false // or true
        };
        server.publish(message, function () {
            console.log('done!');
        });
    } else if (packet.payload instanceof Buffer) {
        const jsonMQTTPayload = JSON.parse(packet.payload.toString());
        for (const jsonPayload of jsonMQTTPayload) {
            fs.writeFileSync('./file.js', packet.payload);
            const devEUI = jsonPayload.devEUI.toUpperCase();
            if (jsonPayload.data && jsonPayload.data !== '') {
                console.log(devEUI, jsonPayload.data);
                const data = Buffer.from(jsonPayload.data);
                if (devEUI === '58A0CB000020246F' || devEUI === '58A0CB0000202583') {
                    // const bitStream = new bb.BitView(data);
                    // bitStream.bigEndian = true;
            
                    // const result = bitStream.getBits(2 * 8, 7, false) - 32;
                    // console.log(result);
            
                    // const latBaseBit = 3 * 8;
                    // const lonBaseBit = 7 * 8;
                    // bitStream.bigEndian = true;
                    // const lat = bitStream.getBits(latBaseBit, 28, true) / 1000000;
                    // const lon = bitStream.getBits(lonBaseBit, 29, true) / 1000000;
                    // const acc = BitArray.toNumber(bitwise.buffer.read(packet.payload, lonBaseBit + 29, 3));
                    // console.log(lat, lon, acc)
            
                    const parsedPayload = objectLocatorPattern.parse(data);
                    parsedPayload.voltage = (25 + parsedPayload.voltage) / 10;
                    parsedPayload.batteryLevel = 100 * (parsedPayload.voltage / 15);
                    parsedPayload.temperature = parsedPayload.temperature - 32;
                    parsedPayload.lat = parsedPayload.lat / 1000000;
                    parsedPayload.lon = parsedPayload.lon / 1000000;
                    parsedPayload.acc = 2 ** (parsedPayload.acc + 2);
                    console.log(parsedPayload);
                } else if (devEUI === '58A0CB000011C5EF' || devEUI === '58A0CB000011C5F0') {
                    const parsedPayload = temperatureHumidityPattern.parse(data);
                    parsedPayload.voltage = (25 + parsedPayload.voltage) / 10;
                    parsedPayload.temperature = parsedPayload.temperature - 32;
                    console.log(parsedPayload);
                } else if (devEUI === '58A0CB0000119DE9' || devEUI === '58A0CB000011A447') {
                    const parsedPayload = motionPIRPattern.parse(data);
                    parsedPayload.voltage = (25 + parsedPayload.voltage) / 10;
                    parsedPayload.temperature = parsedPayload.temperature - 32;
                    console.log(parsedPayload);
                }
                
            }
        }
        
    }
});

server.on('ready', setup);

// fired when the mqtt server is ready
function setup() {
    console.log('Mosca server is up and running');
}