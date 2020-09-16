var mosca = require('mosca');
var packet = require('packet');

var parser = packet.createParser();
var serializer = parser.createSerializer();
var downlinkTopic = "GIOT-GW/DL/000080029c601e41";
var downlinkClientId = "abc";

const fs = require('fs');

const sensorList = [
    {
        macAddr: null,
        devEUI: "58A0CB000011C5EF",
        sensorType: "temperature_humidity"
    },
    {
        macAddr: "0000000000000001",
        devEUI: "58A0CB000011C5F0",
        sensorType: "temperature_humidity"
    },
    {
        macAddr: null,
        devEUI: "58A0CB000010DC04",
        sensorType: "sound_level"
    },
    {
        macAddr: null,
        devEUI: "58A0CB0000103F06",
        sensorType: "sound_level"
    },
    {
        macAddr: null,
        devEUI: "58A0CB0000202583",
        sensorType: "object_locator"
    },
    {
        macAddr: null,
        devEUI: "58A0CB000020246F",
        sensorType: "object_locator"
    },
    {
        macAddr: null,
        devEUI: "58A0CB000010D732",
        sensorType: "door_window"
    },
    {
        macAddr: null,
        devEUI: "58A0CB00001083B6",
        sensorType: "door_window"
    },
    {
        macAddr: null,
        devEUI: "58A0CB0000119DE9",
        sensorType: "motion_PIR"
    },
    {
        macAddr: null,
        devEUI: "58A0CB000011A447",
        sensorType: "motion_PIR"
    },
    {
        macAddr: null,
        devEUI: "58A0CB000011E2DE",
        sensorType: "IAQ"
    },
    {
        macAddr: null,
        devEUI: "58A0CB000011E14C",
        sensorType: "IAQ"
    },
    {
        macAddr: null,
        devEUI: "58A0CB000010B16F",
        sensorType: "water_leak"
    },
    {
        macAddr: null,
        devEUI: "58A0CB000010AFD1",
        sensorType: "water_leak"
    }
]

parser.packet("object_locator", `
b8{x3, b1 => isGNSSError, b1 => isGNSSFix, x1, b1 => isMovingMode, b1 => isButtonTriggered },
b8{b4 => batteryLevel, b4 => voltage},
b8{x1, b7 => temperature},
l32{x4, -b28 => lat},
l32{b3 => acc, -b29 => lon}
`);

parser.packet("temperature_humidity", `
b8{x4, b1 => isIAQ, x3},
b8{b4 => batteryLevel, b4 => voltage},
b8{x1, b7 => temperature},
b8{x1, b7 => humidity},
b16 => co2,
b16 => voc
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

parser.packet("motion_PIR", `
b8{x7, b1 => isOccupied},
b8{b4 => batteryLevel, b4 => voltage},
b8{x1, b7 => temperature},
l16 => timeElapsed,
l24 => counter
`);

parser.packet("sound_level", `
b8{x7, b1 => isKeepAlive},
b8{b4 => batteryLevel, b4 => voltage},
b8{x1, b7 => temperature},
b8 => decibel
`);

parser.packet("door_window", `
b8{x7, b1 => isOpen},
b8{b4 => batteryLevel, b4 => voltage},
b8{x1, b7 => temperature},
l16 => timeElapsed,
l24 => counter
`);

parser.packet("door_window_cmd", `
b8 => keepAliveCmd,
l16 => keepAliveConfig
`);

parser.packet("water_leak", `
b8{x1, b1 => isRHChanged, b1 => isTempChanged, b1 => isInterrupt, x3, b1 => isLeak},
b8{b4 => batteryLevel, b4 => voltage},
b8{x1, b7 => temperature},
b8{x1, b7 => humidity},
b8{x1, b7 => temperature_env}
`);

parser.packet("IAQ", `
b8{x1, b1 => isIAQChanged, b1 => isRHChanged, b1 => isTempChanged, b1 => isIAQ, x2, b1 => isKeepAlive},
b8{b4 => batteryLevel, b4 => voltage},
b8{x1, b7 => temperature},
b8{x1, b7 => humidity},
l16 => co2_est,
l16 => voc,
l16 => iaq,
b8{x1, b7 => temperature_env}
`);

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
    if (client && client.id === downlinkClientId) {
        console.log('client', client.id);
        const jsonMQTTPayload = JSON.parse(packet.payload.toString());
        const sensor = sensorList.find(s => s.devEUI === jsonMQTTPayload.devEUI);
        if (!sensor) {
            console.log(`sensor Not FOUND ${jsonMQTTPayload.devEUI}`);
            return;
        }

        serializer.serialize(`${sensor.sensorType}_cmd`, jsonMQTTPayload.cmdContent);
        var buf = new Buffer.alloc(serializer.sizeOf)
        serializer.write(buf);
        console.log(buf.toString('hex').toUpperCase());

        const commandList = [{
            macAddr: sensor.macAddr,
            data: buf.toString('hex').toUpperCase(),
            id: "2",
            extra: {
                devEUI: sensor.devEUI,
                port: jsonMQTTPayload.port,
                txpara: '2'
            }
        }];
        console.log(commandList[0]);

        var message = {
            topic: downlinkTopic,
            payload: JSON.stringify(commandList), // or a Buffer
            qos: 0, // 0, 1, or 2
            retain: false // or true
        };
        server.publish(message, function () {
            console.log('done!');
        });
    } else if (packet.payload instanceof Buffer) {
        const jsonMQTTPayload = JSON.parse(packet.payload.toString());
        console.log(jsonMQTTPayload);
        if (Array.isArray(jsonMQTTPayload)) {
            for (const jsonPayload of jsonMQTTPayload) {
                fs.writeFileSync('./file.js', packet.payload);
                const devEUI = jsonPayload.devEUI.toUpperCase();
                if (jsonPayload.data && jsonPayload.data !== '') {
                    console.log(devEUI, jsonPayload.data);
                    const data = Buffer.from(jsonPayload.data, 'hex');
                    const sensor = sensorList.find(s => s.devEUI === devEUI);

                    if (sensor) {
                        sensor.macAddr = jsonPayload.macAddr;
                        if (sensor.sensorType === "object_locator") {
                            parser.extract("object_locator", function (parsedPayload) {
                                parsedPayload.voltage = (25 + parsedPayload.voltage) / 10;
                                parsedPayload.batteryLevel = 100 * (parsedPayload.batteryLevel / 15);
                                parsedPayload.temperature = parsedPayload.temperature - 32;
                                parsedPayload.lat = parsedPayload.lat / 1000000;
                                parsedPayload.lon = (parsedPayload.lon / 1000000);
                                parsedPayload.acc = 2 ** (parsedPayload.acc + 2);
                                console.log(parsedPayload);
                            });
                        } else if (sensor.sensorType === "temperature_humidity") {
                            parser.extract("temperature_humidity", function (parsedPayload) {
                                parsedPayload.voltage = (25 + parsedPayload.voltage) / 10;
                                parsedPayload.batteryLevel = 100 * (parsedPayload.batteryLevel / 15);
                                parsedPayload.temperature = parsedPayload.temperature - 32;
                                console.log(parsedPayload);
                            });
                        } else if (sensor.sensorType === "motion_PIR") {
                            parser.extract("motion_PIR", function (parsedPayload) {
                                parsedPayload.voltage = (25 + parsedPayload.voltage) / 10;
                                parsedPayload.batteryLevel = 100 * (parsedPayload.batteryLevel / 15);
                                parsedPayload.temperature = parsedPayload.temperature - 32;
                                console.log(parsedPayload);
                            });
                        } else if (sensor.sensorType === "sound_level") {
                            parser.extract("sound_level", function (parsedPayload) {
                                parsedPayload.voltage = (25 + parsedPayload.voltage) / 10;
                                parsedPayload.batteryLevel = 100 * (parsedPayload.batteryLevel / 15);
                                parsedPayload.temperature = parsedPayload.temperature - 32;
                                console.log(parsedPayload);
                            });
                        } else if (sensor.sensorType === "door_window") {
                            parser.extract("door_window", function (parsedPayload) {
                                parsedPayload.voltage = (25 + parsedPayload.voltage) / 10;
                                parsedPayload.batteryLevel = 100 * (parsedPayload.batteryLevel / 15);
                                parsedPayload.temperature = parsedPayload.temperature - 32;
                                console.log(parsedPayload);
                            });
                        } else if (sensor.sensorType === "water_leak") {
                            parser.extract("water_leak", function (parsedPayload) {
                                parsedPayload.voltage = (25 + parsedPayload.voltage) / 10;
                                parsedPayload.batteryLevel = 100 * (parsedPayload.batteryLevel / 15);
                                parsedPayload.temperature = parsedPayload.temperature - 32;
                                parsedPayload.temperature_env = parsedPayload.temperature_env - 32;
                                console.log(parsedPayload);
                            });
                        } else if (sensor.sensorType === "IAQ") {
                            parser.extract("IAQ", function (parsedPayload) {
                                parsedPayload.voltage = (25 + parsedPayload.voltage) / 10;
                                parsedPayload.batteryLevel = 100 * (parsedPayload.batteryLevel / 15);
                                parsedPayload.temperature = parsedPayload.temperature - 32;
                                parsedPayload.temperature_env = parsedPayload.temperature_env - 32;
                                console.log(parsedPayload);
                            });
                        }
                        parser.parse(data);
                    } else {
                        console.log(jsonMQTTPayload);
                    }
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