module.exports = function(app) {
    const fs = require('fs');
    const path = require('path');

    // Single word/phrase update endpoint
    app.post('/api/word', (req, res) => {
        const { username, sessionToken, language, wordOrPhrase, translation, understanding } = req.body;
        if (!username || !sessionToken || !language || !wordOrPhrase) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        // Optionally: Validate sessionToken here (not implemented for brevity)

        // Load or create user data file
        const userDataDir = path.join(__dirname, '../Data/Dictionaries');
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }
        const userDataPath = path.join(userDataDir, `${username}_${language}.json`);
        let data = {};
        try {
            if (fs.existsSync(userDataPath)) {
                data = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
            }
        } catch (e) {
            data = {};
        }

        // Update or add the word/phrase
        data[wordOrPhrase] = { translation, understanding };

        try {
            fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2), 'utf8');
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: 'Could not save word.' });
        }
    });
};
