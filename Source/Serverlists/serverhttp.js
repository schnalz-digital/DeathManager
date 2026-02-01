/**
 * Simple Node.js HTTP Server that responds with JSON data
 * when accessing the /zandronum path.
 *
 * To run this script:
 * 1. Ensure Node.js is installed.
 * 2. Save this code as 'server.js'.
 * 3. Open your terminal in the same directory and run: node server.js
 * 4. Access http://localhost:3000/zandronum in your browser or a tool like curl.
 */

const http = require('http');
const zlib = require('zlib');

// --- Configuration ---
const HOSTNAME = '0.0.0.0'; // Listen on localhost
const PORT = 5666;
const PATH_ZANDRO = '/doom/zandronum';      // bei uberspace als webbackend /doom und port 5666 eingerichtet
const PATH_CHOC = '/doom/chocolate';
const PATH_ODAMEX = '/doom/odamex';
//also muss http server auf pfad /doom/zandronum hören

// const {getServers, refreshServers} = require('./getallZandronum.js');
const zandro = require('./getallZandronum.js');
const choc = require('./getallChoc.js');
const odamex = require('./getallOdamex.js');


let sendbytes = 0;

// refreshServers();

//refresh Servers every 10 mins.
// setInterval(() => {
//     refreshServers();
// }, 60000*10);

/**
 * Handles incoming HTTP requests.
 * @param {http.IncomingMessage} req - The request object.
 * @param {http.ServerResponse} res - The response object.
 */
const requestListener = async function (req, res) {
    // Log the incoming request
    console.log(`[${new Date().toLocaleString()}] Request received: from ${req.socket.remoteAddress} to ${req.url}`);
    const acceptEncoding = req.headers['accept-encoding'] || '';

    let encode = '';
    if (acceptEncoding.includes('br')) {
        encode = 'br'
    } else if (acceptEncoding.includes('gzip')) {
        encode = 'gzp';
    }

    let headdata = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Optional: Allows requests from any domain (CORS)
        'Content-Encoding': encode    //for Brotli
        }


    if (req.url === PATH_ZANDRO) {

        await zandro.refreshServers();
        
        // 2. Convert the in-memory JavaScript object to a JSON string
        const serverlist = JSON.stringify(zandro.getServers(), null, 2);

        respond(encode, res, headdata, serverlist);
    }
    else if (req.url === PATH_CHOC) {

        await choc.refreshServers();
        
        // 2. Convert the in-memory JavaScript object to a JSON string
        const serverlist = JSON.stringify(choc.getServers(), null, 2);

        respond(encode, res, headdata, serverlist);
    }
    else if (req.url === PATH_ODAMEX) {

        await odamex.refreshServers();
        
        // 2. Convert the in-memory JavaScript object to a JSON string
        const serverlist = JSON.stringify(odamex.getServers(), null, 2);
        
        respond(encode, res, headdata, serverlist);
    } else {
        // Handle all other paths with a 404 Not Found error
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('404 Not Found.');
    }
};


async function respond(encode, res, headdata, json) {
    let data = await compressJson(json, encode);
    sendbytes += data.byteLength;
    console.log('total sent MB: ', ((sendbytes/1024)/1024).toFixed(2) );
    
    // 1. Set the response status and headers for JSON
    res.writeHead(200, headdata);
        // 3. Send the JSON string as the response body and close the connection
    res.end(data);
}


// Level 11 ist am langsamsten, aber komprimiert am besten. Ideal für statische Assets.
const brotliOptions = {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY } // 11
};
// Gzip unterstützt Stufen von 0 (keine) bis 9 (am besten, aber langsam)
const gzipOptions = {   
    level: zlib.constants.Z_BEST_COMPRESSION // 9
};


function compressJson(json, encode) {
    return new Promise((resolve) => {
        let options;
        if (encode == 'br') {
            compressor = zlib.brotliCompress;
            options = brotliOptions;
        } else if (encode = 'gzip') {
            compressor = zlib.gzip;
            options = gzipOptions;
        }
        compressor(Buffer.from(json), options, (err, compressedData) => {
            resolve(compressedData);
        });
    });
}


// --- Create and Start the Server ---
const server = http.createServer(requestListener);

server.listen(PORT, HOSTNAME, () => {
    console.log(`Data endpoint is ready at http://${HOSTNAME}:${PORT}${PATH_ZANDRO}`);
    console.log(`Data endpoint is ready at http://${HOSTNAME}:${PORT}${PATH_CHOC}`);     
    console.log(`Data endpoint is ready at http://${HOSTNAME}:${PORT}${PATH_ODAMEX}`);                      
});

// Basic error handling for the server
server.on('error', (err) => {
    console.error(`Server encountered an error: ${err.message}`);
    // Handle EADDRINUSE (port already in use) specifically
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please stop the other process or choose a different port.`);
        process.exit(1);
    }
});

