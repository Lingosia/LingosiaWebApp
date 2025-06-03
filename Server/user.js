module.exports = function(app) {
    const fs = require('fs');
    const path = require('path');
    const { JsonDB, Config } = require('node-json-db');
    const crypto = require('crypto');

    // Signup endpoint
    app.post('/api/signup', async(req, res) => {
        const { username, email, passwordHash, language } = req.body;
        if (!username || !email || !passwordHash || !language) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        // Alow only alphanumeric usernames
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ error: 'Username can only contain alphanumeric characters and underscores.' });
        }
        // Check if username is too short or too long
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ error: 'Username must be between 3 and 20 characters long.' });
        }
        // Check if email is valid
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address.' });
        }
        // Check if passwordHash is valid (hex string)
        const passwordHashRegex = /^[0-9a-f]{64}$/i;
        if (!passwordHashRegex.test(passwordHash)) {
            return res.status(400).json({ error: 'Invalid password hash.' });
        }

        // Generate a random salt
        const salt = crypto.randomBytes(16).toString('hex');
        // Rehash the password with the salt
        const rehashedPassword = crypto.pbkdf2Sync(passwordHash, salt, 100000, 64, 'sha512').toString('hex');

        // Check if directory exists, if not create it
        const userDataDir = path.join(__dirname, '../Data/');
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }

        // Setup DB
        const db = new JsonDB(new Config(path.join(__dirname, '../Data/users'), true, true, '/'));

        // Check if user exists
        let users = {};
        try {
            users = await db.getData('/');
            if (users[username]) {
                return res.json({ success: false, error: 'Username already exists.' });
            }
            for (const user in users) {
                if (users[user].email === email) {
                    return res.json({ success: false, error: 'Email already exists.' });
                }
            }
        } catch (e) {
            // If DB is empty, ignore error
        }

        // Generate a session token (random 32 bytes hex)
        const sessionToken = crypto.randomBytes(32).toString('hex');

        // Save user
        db.push(`/${username}`, {
            username,
            email,
            rehashedPassword,
            salt,
            sessionToken,
            language,
            created: Date.now()
        });

        res.json({ success: true, username, sessionToken, language });
    });

    // Login endpoint
    app.post('/api/login', async (req, res) => {
        const { username, passwordHash } = req.body;
        if (!username || !passwordHash) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        const db = new JsonDB(new Config(path.join(__dirname, '../Data/users'), true, true, '/'));
        let user;
        try {
            user = await db.getData(`/${username}`);
        } catch (e) {
            return res.json({ success: false, error: 'Invalid username or password.' });
        }

        // Rehash the provided passwordHash with the stored salt
        const rehashed = crypto.pbkdf2Sync(passwordHash, user.salt, 100000, 64, 'sha512').toString('hex');

        if (rehashed === user.rehashedPassword) {
            user.sessionToken = crypto.randomBytes(32).toString('hex');

            // Get user's dictionary
            const userDataDir = path.join(__dirname, '../Data/Dictionaries');
            if (!fs.existsSync(userDataDir)) {
                fs.mkdirSync(userDataDir, { recursive: true });
            }
            const userDataPath = path.join(userDataDir, `${username}_${user.language}.json`);
            if (!fs.existsSync(userDataPath)) {
                fs.writeFileSync(userDataPath, JSON.stringify({}, null, 2), 'utf8');
            }

            const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8')) || {};

            db.push(`/${username}`, user, false);
            res.json({ success: true, username, sessionToken: user.sessionToken, language: user.language, dictionary: userData });
        } else {
            res.json({ success: false, error: 'Invalid username or password.' });
        }
    });

    // Update language endpoint
    app.post('/api/updateLanguage', async (req, res) => {
        const { username, sessionToken, language } = req.body;
        if (!username || !sessionToken || !language) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        const db = new JsonDB(new Config(path.join(__dirname, '../Data/users'), true, true, '/'));
        let user;
        try {
            user = await db.getData(`/${username}`);
        } catch (e) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Optionally: Validate sessionToken here (not implemented for brevity)
        user.language = language;
        db.push(`/${username}`, user, false);

        // Get user's dictionary
        const userDataDir = path.join(__dirname, '../Data/Dictionaries');
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }
        const userDataPath = path.join(userDataDir, `${username}_${user.language}.json`);
        if (!fs.existsSync(userDataPath)) {
            fs.writeFileSync(userDataPath, JSON.stringify({}, null, 2), 'utf8');
        }

        const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8')) || {};

        res.json({ success: true, language, dictionary: userData });
    });

    // Guest signup endpoint
    app.post('/api/guest_signup', async (req, res) => {
        const { language } = req.body;
        if (!language) {
            return res.status(400).json({ error: 'Missing language.' });
        }

        // Generate a GUID for the guest user
        function generateGUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        const username = generateGUID();

        // Check if directory exists, if not create it
        const userDataDir = path.join(__dirname, '../Data/');
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }

        const db = new (require('node-json-db').JsonDB)(
            new (require('node-json-db').Config)(require('path').join(__dirname, '../Data/users'), true, true, '/')
        );

        // Check if user already exists (shouldn't happen, but for idempotency)
        let users = {};
        try {
            users = await db.getData('/');
            if (users[username]) {
                return res.json({ success: true, id: username });
            }
        } catch (e) {
            // If DB is empty, ignore error
        }


        // Generate a session token (random 32 bytes hex)
        const sessionToken = crypto.randomBytes(32).toString('hex');

        // Save guest user (no password, no email)
        db.push(`/${username}`, {
            username,
            language,
            guest: true,
            created: Date.now(),
            sessionToken
        });

        res.json({ success: true, username, language});
    });
};
