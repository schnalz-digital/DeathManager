
const dgram = require("dgram");

const HOST = 'master1.odamex.net';
const PORT = 15000;
const MASTER_QUERY = 777123;

  const request = Buffer.alloc(4);
  request.writeInt32LE(MASTER_QUERY, 0);   // long (32-bit)



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

            let header = msg.readUInt32LE(0); //Header littleendia = true
            let offset = 4;
            if (header == 777123) 
            {
                // console.log('Tag von Server 777123 erhalten.');
                let servercount = msg.readUInt16LE(offset);
                offset += 2;
                // console.log(servercount);

                for (let i = 0; i < servercount && offset < msg.length; i++) {
                    let ip = [
                        msg.readUInt8(offset), 
                        msg.readUInt8(offset + 1), 
                        msg.readUInt8(offset + 2), 
                        msg.readUInt8(offset + 3)]
                        .join('.');
                    offset += 4;

                    let port = msg.readUint16LE(offset)
                    offset += 2;
                    servers.push({ip, port});
                }

                // console.log(servers);
                socket.close();
                resolve(servers);        
            }
            else {
                console.log('Falscher Tag von Server. Evtl. neuer Masterserver Tag.');
                socket.close();
                resolve([]);        
            }
                                     
            });

        socket.send(request, 0, request.length, PORT, HOST, (err) => {
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


async function run() {
    let s = await getServerListFromMaster();

    console.log(JSON.stringify(s, null, 4));
}

// run();

module.exports = {getServerListFromMaster}