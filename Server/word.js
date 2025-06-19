const utils = require('./utils.js');
const { JsonDB, Config } = require('node-json-db');

module.exports = function(app) {
    const fs = require('fs');
    const path = require('path');

    // Single word/phrase update endpoint
    app.post('/api/word', (req, res) => {
        const { username, sessionToken, language, wordOrPhrase, translation, understanding } = req.body;
        if (!username || !sessionToken || !language || !wordOrPhrase) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        // Validate session token
        if (!utils.isSessionValid(username, sessionToken)) {
            return res.status(401).json({ error: 'Invalid session token.' });
        }

        // Use JsonDB to store user data
        const userDataDir = path.join(__dirname, '../Data/Dictionaries');
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }
        const userDataPath = path.join(userDataDir, `${username}_${language}`);

        // Initialize JsonDB for this user's language dictionary
        const db = new JsonDB(new Config(userDataPath, true, true, '/'));

        try {
            // Set or update the word/phrase entry
            db.push(`/${wordOrPhrase}`, { translation, understanding }, true);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: 'Could not save word.' });
        }
    });
};
