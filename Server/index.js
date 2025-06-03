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