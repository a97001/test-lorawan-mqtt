var Parser = require("binary-parser").Parser;
const data = Buffer.from('010b3a00003a0700', 'hex');

const motionPIRPattern = new Parser()
  // .endianess('little')
  .bit7('skip')
  .bit1('isOccupied')
  .bit4('skip1')
  .bit4('voltage')
  .bit1('skip2')
  .bit7('temperature')
  .uint16le('timeEsp')
  // .bit24('counter')
  .array("uint24", {
    type: "uint8",
    length: 3,
    formatter: function (arr) {
      console.log(arr[2] << 16 , arr[1] << 8 , arr[0]);
      console.log(arr, arr[2] << 16 | arr[1] << 8 | arr[0]);
      return arr[2] << 16 | arr[1] << 8 | arr[0];
    }
  });

console.log(data.readIntLE(5, 3));



const parsedPayload = motionPIRPattern.parse(data);
parsedPayload.voltage = (25 + parsedPayload.voltage) / 10;
parsedPayload.temperature = parsedPayload.temperature - 32;
console.log(parsedPayload);