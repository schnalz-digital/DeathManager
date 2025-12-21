const dgram = require("dgram");
const huffman = require("./huffman").create();

const MASTER_SERVER = "master.zandronum.com";
const MASTER_PORT = 15300;
const LAUNCHER_MASTER_CHALLENGE = 5660028;    //für Anfragepaket der Serverliste

const MSC_IPISBANNED = 3;
const MSC_REQUESTIGNORED = 4;
const MSC_WRONGVERSION = 5;


//Infos über Datenpaket Struktur:
// https://wiki.zandronum.com/Launcher_protocol
//
//Anfragen müssen auch schon mit Huffman komprimiert werden.
//oder den Präfix der Anfragen mit 0xFF Byte versehen werden.
//
//Antworten vom Server sind immer Huffman komprimiert.

//---- Anfragepaket für Server Liste (Little Endian + 0xFF Präfix)
function createRequestMasterServerList() {
  
  const requesta = Buffer.alloc(6);
  // request.writeUInt8(0xFF, 0);                        // Präfix, falls Anfrage nicht Huffman kodiert wird
  requesta.writeInt32LE(LAUNCHER_MASTER_CHALLENGE, 0);   // long (32-bit)
  requesta.writeInt16LE(2, 4);                           // short (16-bit)
  
  return requesta;
}
//--------------------------------------


function waitForMasterAnswer() {
  return new Promise((resolve) => {
    let servers = [];
    let socket = dgram.createSocket("udp4");
    let timeout = setTimeout(() => {
      socket.close();
      resolve( [] );
    }, 2000);

    socket.on("message", (msg, rinfo) => {
      // console.log(`Antwort von ${rinfo.address}:${rinfo.port} (${msg.length} Bytes)`);
      clearTimeout(timeout);
      let buffer = huffman.decode(msg);

      let offset = 0;

      let response = buffer.readUInt32LE(0);  // Long read (4 bytes) first answer
      offset += 4; // next 4 Bytes beause of Long read before

      // console.log('Received %d byte response: %d', buffer.length, response);

      switch (response) {
        case MSC_IPISBANNED: {
            console.log('banned from server');
            resolve([]);
        }
        case MSC_REQUESTIGNORED: {
            console.log('ignored from server');
            resolve([]);
        }
        case MSC_WRONGVERSION: {
            console.log('master version too old');
            resolve([]);
        }
        default:
          break;
      }

      let packetnr = buffer.readUInt8(offset);
      offset +=1;
      // console.log('Packet Nr: ', packetnr) // read Packet Nr. 1 byte;
      let BeginServerBlock = buffer.readUInt8(offset);
      offset +=1;
      // console.log('Begin Server Blog Flag: ', BeginServerBlock) // read BeginServerBlock (always value 8) 1 byte;

      while (1) { // read Server Block until no more numServersPerIP (0) available
        let numServersPerIP = buffer.readUInt8(offset);
        offset +=1;
        if (numServersPerIP == 0) {break;}
        // console.log('Number of servers with following IP: ', numServersPerIP);

        let IP=[ buffer.readUInt8(offset),
                  buffer.readUInt8(offset+1), 
                  buffer.readUInt8(offset+2), 
                  buffer.readUInt8(offset+3)].join('.');
        offset += 4;
        // console.log('Server IP: ', IP);

        let port = buffer.readUInt16LE(offset);
        offset += 2;
        // console.log('Server Port: ', port);

        servers.push({ip: IP, port: port});

        for (let i=1; i < numServersPerIP; i++) {
          let portAdd = buffer.readUInt16LE(offset);
          offset += 2;
          // console.log('Additional Server Port: ', portAdd);
          servers.push({ip: IP, port: portAdd});
        }
      }

      let value = buffer.readUInt8(offset);
      offset +=1;
      if (value == 7) {
        // console.log('More Packets come ', value);
      }
      if (value == 0) {
        // console.log('No more Servers in this packet.', value);
      }
      if (value == 2) {
        console.log('No more packets will come, total Servers: ', servers.length);
        socket.close();
        resolve(servers);
      }
    });

    const request = huffman.encode(createRequestMasterServerList());               // Huffman kodieren der Anfrage
    socket.send(request, 0, request.length, MASTER_PORT, MASTER_SERVER, (err) => {
      if (err) {
        console.error("Fehler beim Senden:", err);
        socket.close();
      } else {
        // console.log(`\nAnfrage an ${MASTER_SERVER}:${MASTER_PORT} gesendet.`);
      }
    });

    socket.on("error", (err) => {
      console.error("Fehler:", err);
      socket.close();
    });
  });
}


async function getServerListFromMaster() {

    let servers = await waitForMasterAnswer();
  //  console.log(JSON.stringify(servers, null, 4));
    return servers;
}

// getServerListFromMaster();

module.exports = {getServerListFromMaster}
