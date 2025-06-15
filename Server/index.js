const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const app = express();
const port = 443;

// Load SSL certificates
const certDir = path.join(__dirname, './certificates');
const options = {
    key: fs.readFileSync(path.join(certDir, 'key.pem')),
    cert: fs.readFileSync(path.join(certDir, 'cert.pem'))
};

app.use(express.static(path.join(__dirname, '../Web'), { extensions: ['html']}));
app.use(express.json());

// API endpoints
require('./article')(app);
require('./user')(app);
require('./word')(app);

// Start HTTPS server
https.createServer(options, app).listen(port, () => {
    console.log(`API server running at https://localhost:${port}`);
});

// Redirect HTTP to HTTPS
const http = require('http');
const httpApp = express();
httpApp.use(function(req, res) {
    res.redirect('https://' + req.headers.host + req.originalUrl);
});

http.createServer(httpApp).listen(80, () => {
    console.log('HTTP server running on port 80, redirecting to HTTPS');
});

// Redirect www to non-www
app.use((req, res, next) => {
    if (req.headers.host.startsWith('www.')) {
        const newHost = req.headers.host.replace('www.', '');
        res.redirect(`https://${newHost}${req.originalUrl}`);
    }
    else {
        next();
    }
});