const express = require('express');
const app = express();
const path = require('path');
const os = require('os');
const multer = require('multer');
const ws = require('ws');
const storage = multer.diskStorage({
    destination: (req, file, cb)=>{
        cb(null, os.tmpdir());
    },
    filename: (req, file, cb) => {
        let ext = path.extname(file.originalname);
        cb(null, `${Date.now()}${ext}`);
    }
})
const upload = multer({storage: storage});
const {readFileSync, rmSync, createWriteStream} = require('fs');
const { spawn } = require('child_process');
const process = require('process');

const PYTHON_COMMAND = process.env.PYTHON_COMMAND || path.join(__dirname, "env/bin/python");

let requetsLogger = createWriteStream(`logs/requests-deploy-${Date.now()}.log`, {flags: "a+"})
let processingLogger = createWriteStream(`logs/post-requests-info-deploy-${Date.now()}.log`, {flags: "a+"})
let logProcess = (requestPath, startTime, endTime, fileSize, fileExt, exitCode) => {
    processingLogger.write(JSON.stringify({
        requestPath,
        startTime,
        endTime,
        fileSize,
        fileExt,
        exitCode
    }));
    processingLogger.write("\n");
}

app.use((req, res, next) => {
    let start = new Date();
    res.on('close', () => {
        let end = new Date();
        requetsLogger.write(`[${start.toISOString()}|${end.toISOString()}] ${req.method} ${res.statusCode} ${req.url} ${end-start}ms\n`);
    })
    next()
})

app.get("*/types", (req, res) => {
    let nerTypes = ["ORG", "LOC", "PER", "DAT"];
    let patterns = readFileSync('patterns.csv').toString().trim().split("\n").slice(1);
    for( let linePattern of patterns ){
        let label = JSON.parse(linePattern.split("\t")[1]);
        if( nerTypes.indexOf(label) == -1 ){
            nerTypes.push(label);
        }
    }
	return res.json(nerTypes);
})

app.post("*/html", upload.single('file'), (req, res) => {
    let start = new Date();
    let subproc = spawn(PYTHON_COMMAND,["python-cli/pandoc.py", req.file.path], {...process.env, PYTHONIOENCODING: 'utf-8', PYTHONLEGACYWINDOWSSTDIO: 'utf-8' })
    let buffer = new PassThrough();
    subproc.stdout.pipe(buffer);
    subproc.on("error", (err) => {
        console.log(err);  
    })
    subproc.stderr.on('data', (err) => {
        process.stderr.write(`ERROR: spawn: ${subproc.spawnargs.join(' ')}: ${err.toString()}`)
    });
    subproc.on('close', (code) => {
        let end = new Date();
        console.log("spawn: Exited with",code)
        if( code != 0 ){
            res.status(500).end();
        }
        else{
            buffer.pipe(res);
        }
        rmSync(req.file.path);
        logProcess("/html", start, end, req.file.size, req.file.mimetype, code);
    })
})

app.post("*/docx", upload.single('file'), (req, res) => {
    let start = new Date();
    let out = path.join(os.tmpdir(), `${Date.now()}.docx`)
    let subproc = spawn(PYTHON_COMMAND,["python-cli/inverse-pandoc.py", req.file.path, out], {...process.env, PYTHONIOENCODING: 'utf-8', PYTHONLEGACYWINDOWSSTDIO: 'utf-8' })
    subproc.on("error", (err) => {
        console.log(err);  
    })
    subproc.stderr.on('data', (err) => {
        process.stderr.write(`ERROR: spawn: ${subproc.spawnargs.join(' ')}: ${err.toString()}`)
    });
    subproc.on('close', (code) => {
        let end = new Date();
        console.log("spawn: Exited with",code)
        if( code != 0 ){
            res.status(500).end();
        }
        else{
            res.sendFile(out);
        }
        rmSync(req.file.path);
        logProcess("/docx", start, end, req.file.size, req.file.mimetype, code);
        setTimeout(() => {
            rmSync(out);
        }, 3000)
    })
})

app.post("*/from-text", upload.single('file'), (req, res) => {
    let start = new Date();
    let subproc = spawn(PYTHON_COMMAND,["python-cli/anonimizador-text.py", "-i", req.file.path,"-f","json"], {...process.env, PYTHONIOENCODING: 'utf-8', PYTHONLEGACYWINDOWSSTDIO: 'utf-8' }) // envs might not be needed outside windows world
    subproc.on("error", (err) => {
        console.log(err);
        res.status(500).write(err.toString());
        res.end();
    })
    subproc.stdout.pipe(res);
    subproc.stderr.on('data', (err) => {
        process.stderr.write(`[${new Date().toISOString()} STDERR python-cli/anonimizador-text] ${err.toString()}`)
    });
    subproc.on('close', (code) => {
        let end = new Date();

        process.stderr.write(`[EXIT ${new Date().toISOString()} python-cli/anonimizador-text] CODE: ${code}`)
        logProcess("/from-text", start, end, req.file.size, req.file.mimetype, code);
        rmSync(req.file.path);
    })
})


app.post("*/", upload.single('file'), (req, res) => {
    let start = new Date();
    let subproc = spawn(PYTHON_COMMAND,["black-box-cli.py", req.file.path], {...process.env, PYTHONIOENCODING: 'utf-8', PYTHONLEGACYWINDOWSSTDIO: 'utf-8' }) // envs might not be needed outside windows world
    subproc.on("error", (err) => {
        console.log(err);
        res.status(500).write(err.toString());
        res.end();
    })
    subproc.stdout.pipe(res);
    subproc.stderr.on('data', (err) => {
        process.stderr.write(`[${new Date().toISOString()} STDERR black-box-cli.py .${req.file.path.split(".").at(-1)}] ${err.toString()}`)
    });
    subproc.on('close', (code) => {
        let end = new Date();
        process.stderr.write(`[EXIT ${new Date().toISOString()} black-box-cli.py .${req.file.path.split(".").at(-1)}] CODE: ${code}`)
        logProcess("/", start, end, req.file.size, req.file.mimetype, code);
        rmSync(req.file.path);
    })
})

app.use(express.static("build"))

let pkjson = require('./package.json');
let url = pkjson.proxy;
let port = 7998;
if( url ){
    port = new URL(url).port
}

let http = require("http");
const { PassThrough } = require('stream');
let server = http.createServer(app);
let wss = new ws.WebSocketServer({ clientTracking: false, noServer: true });

server.on('upgrade', (req, sock, head) => {
    if( !req.url.endsWith('/runnlp') ) {
        sock.write('HTTP/1.1 404 Not Found\r\n\r\n');
        sock.destroy();
        return;
    }
    wss.handleUpgrade(req, sock, head, (ws) => {
        wss.emit('connection', ws, req)
    })
})

wss.on('connection', (ws, req) => {
    let startDate = new Date();
    let dataIn = 0;
    let dataOut = 0;
    
    process.stderr.write(`[${new Date().toISOString()} RUN python-cli/nlp-socket.py]\n`)
    let subproc = spawn(PYTHON_COMMAND,["python-cli/nlp-socket.py"], {env: { PYTHONUNBUFFERED: '1', PYTHONIOENCODING: "utf-8:surrogateescape", ...process.env }}) // utf8 envs might not be needed outside windows world
    
    let send = (line) => {
        dataOut += line.length
        ws.send(line);
    }

    ws.on("close", () => {
        subproc.stdin.end();
    })
    
    ws.on("message", (d) => {
        dataIn+=d.toString().length;
        subproc.stdin.write(`${d}\n`);
    });
    
    subproc.on("error", (err) => {
        process.stderr.write(`[${new Date().toISOString()} ERROR python-cli/nlp-socket.py] ${err.toString()}\n`)
    })

    let buffer = "";
    subproc.stdout.on("data", (data) => {
        buffer += data.toString();
        let ms = buffer.split("\n");
        buffer = ms.at(-1);
        for( let line of ms.slice(0,-1) ){
            send(line);
        }
    })

    subproc.stderr.on('data', (err) => {
        process.stderr.write(`[${new Date().toISOString()} STDERR python-cli/nlp-socket.py] ${err.toString()}\n`)
    });

    subproc.on('close', (code) => {
        for(let line of buffer.split("\n") ){
            send(line) // Empty buffer
        }
        ws.close();
        let endDate = new Date();

        process.stderr.write(`[${new Date().toISOString()} EXIT python-cli/nlp-socket.py] `)
        process.stderr.write(JSON.stringify({
            time: endDate - startDate,
            dataIn,
            dataOut,
            code
        }))
        process.stderr.write(`\n`)
    })  
})

server.listen(port);