const dgram = require("dgram");

const MASTER_SERVER = 'master.chocolate-doom.org';
const MASTER_PORT = 2342;

const NET_MASTER_PACKET_TYPE_QUERY = 2;

//all infos from chocolate doom github project

  const request = Buffer.alloc(2);
  request.writeInt16BE(NET_MASTER_PACKET_TYPE_QUERY, 0);   // long (32-bit)



async function getServerListFromMaster() {
    return new Promise(async (resolve) => {
        let servers = [];
        let socket = dgram.createSocket("udp4");
        let timeout = setTimeout(() => {
            socket.close();
            resolve( [] );
        }, 2000);
        
        socket.on("message", (msg, rinfo) => {
            clearTimeout(timeout);
            // console.log(`\nAntwort erhalten von ${rinfo.address}:${rinfo.port} (${msg.length} Bytes)`);

            let header = msg.readInt16BE(0); //Header
            let offset = 2;
            if (header == 3) 
            {
                // console.log('MasterServerHeader == 3 ok')

                let str = 'address:port'
                while (offset < msg.byteLength && str != '')
                {                  
                    str = readString(msg, offset);
                    offset += str.length +1;
                    // console.log(str);

                    let addr = str.split(':')
                    servers.push({ip: addr[0], port: addr[1]})
                }
                
                // console.log(servers);
                
                socket.close();
                resolve(servers);
            } 
            else {
                socket.close();
                resolve([]);
            }

        });

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


function readString(buffer, offset) {
    if (buffer.readUInt8(offset) === 0) {
        return '';
    }

    let i = offset;
    while (buffer.readUInt8(i++) != 0); i--;
    
    let str = buffer.toString('ascii', offset, i);
    offset += str.length + 1;
    return str;
}


async function run() {
    let s = await getServerListFromMaster();

    console.log(JSON.stringify(s, null, 4));
}

// run();

module.exports = {getServerListFromMaster}