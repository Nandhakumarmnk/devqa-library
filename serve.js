/* ============================================================
   Serves the library over a real address, because voice cannot
   work any other way.

   Chrome only hands the microphone to a page it considers secure.
   A file opened by double-clicking index.html is not one — it says
   "not-allowed" and there is no permission icon in the address bar
   to fix it with. localhost counts as secure, so the laptop only
   needs plain http. A phone on the Wi-Fi does not: to it this
   machine is 192.168.x.x, which is not secure, so the microphone
   stays blocked. That is what the https port is for — a self-signed
   certificate, one warning to accept on the phone, and the mic works.

       node serve.js            (or double-click Start-Library-Server.cmd)

   Nothing is installed and nothing leaves the machine; this is the
   same folder, served instead of opened.
   ============================================================ */

var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var os = require('os');
var cp = require('child_process');

var ROOT = __dirname;
var HTTP_PORT = 5173;
var HTTPS_PORT = 5174;
var CERT_DIR = path.join(ROOT, '.certs');

var TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.md': 'text/plain; charset=utf-8'
};

function lanAddress() {
  var nets = os.networkInterfaces(), found = null;
  Object.keys(nets).forEach(function (name) {
    (nets[name] || []).forEach(function (a) {
      if (a.family === 'IPv4' && !a.internal && !found) found = a.address;
    });
  });
  return found;
}

function handler(req, res) {
  var urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  var file = path.join(ROOT, urlPath.replace(/^\/+/, ''));
  // never serve anything outside this folder
  if (path.relative(ROOT, file).split(path.sep)[0] === '..') {
    res.writeHead(403); res.end('forbidden'); return;
  }

  fs.readFile(file, function (err, buf) {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found: ' + urlPath); return; }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'          // edits show up on reload, always
    });
    res.end(buf);
  });
}

/* --- self-signed certificate, made once and reused ------------- */
function certificate(ip) {
  var keyFile = path.join(CERT_DIR, 'dev-key.pem');
  var crtFile = path.join(CERT_DIR, 'dev-cert.pem');
  if (fs.existsSync(keyFile) && fs.existsSync(crtFile)) {
    return { key: fs.readFileSync(keyFile), cert: fs.readFileSync(crtFile) };
  }
  if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR);

  var san = 'DNS:localhost,IP:127.0.0.1' + (ip ? ',IP:' + ip : '');
  var args = ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '825',
              '-keyout', keyFile, '-out', crtFile,
              '-subj', '/CN=DevQA Library',
              '-addext', 'subjectAltName=' + san];
  try {
    cp.execFileSync('openssl', args, { stdio: 'ignore' });
    return { key: fs.readFileSync(keyFile), cert: fs.readFileSync(crtFile) };
  } catch (e) {
    return null;                            // no openssl — http only
  }
}

var ip = lanAddress();

http.createServer(handler).listen(HTTP_PORT, '0.0.0.0', function () {
  var creds = certificate(ip);
  if (creds) https.createServer(creds, handler).listen(HTTPS_PORT, '0.0.0.0', report);
  else report();

  function report() {
    console.log('');
    console.log('  DevQA Library is being served from this folder.');
    console.log('');
    console.log('  On this laptop   http://localhost:' + HTTP_PORT);
    if (creds && ip) {
      console.log('  On your phone    https://' + ip + ':' + HTTPS_PORT);
      console.log('                   (same Wi-Fi. Chrome will warn the certificate is');
      console.log('                    not trusted — tap Advanced, then Proceed. That');
      console.log('                    warning is this machine, and voice needs https.)');
    } else if (ip) {
      console.log('  On your phone    http://' + ip + ':' + HTTP_PORT + '   (reading only —');
      console.log('                   openssl was not found, so there is no https port and');
      console.log('                   the phone cannot use the microphone.)');
    }
    console.log('');
    console.log('  Voice needs one of these addresses. Opening index.html by');
    console.log('  double-clicking it will never get the microphone.');
    console.log('');
    console.log('  Leave this window open. Ctrl+C stops it.');
    console.log('');
  }
}).on('error', function (e) {
  if (e.code === 'EADDRINUSE') console.error('\n  Port ' + HTTP_PORT + ' is already in use — the server may already be running.\n');
  else console.error(e);
});
