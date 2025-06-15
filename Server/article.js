const llm = require('./article_llm.js');

module.exports = function (app) {
    const fs = require('fs');
    const path = require('path');
    const { v4: uuidv4 } = require('uuid');
    const { JsonDB, Config } = require('node-json-db');

    function isValidGuid(id) {
        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return !!id && guidRegex.test(id);
    }

    function isArticleVisible(id) {
        const metaPath = path.join(__dirname, '../Data/articles.json');
        let articles = [];
        try {
            if (fs.existsSync(metaPath)) {
                articles = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            }
        } catch (e) {
            return { error: { status: 500, message: 'Could not read articles metadata.' } };
        }

        const article = articles.find(a => a.id === id && a.visible);
        if (!article) {
            return { error: { status: 404, message: 'Article not found or not visible.' } };
        }
        return { article };
    }

    function sendArticleContent(id, res) {
        const filePath = path.join(__dirname, '../Data/Articles', `${id}.txt`);
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                res.status(500).json({ error: 'Could not read article.' });
            } else {
                res.send(data);
            }
        });
    }

    async function isSessionValid(username, sessionToken) {

        const dbPath = path.join(__dirname, '../Data/users.json');
        if (!fs.existsSync(dbPath)) {
            return false;
        }
        const db = new JsonDB(new Config(dbPath, true, true, '/'));
        try {
            const user = await db.getData(`/${username}`);
            return user.sessionToken === sessionToken;
        } catch (e) {
            return false;
        }
    }

    function validateNewArticleInput({ username, sessionToken, title, content, isPublic, language }, res) {
        if (!username || !sessionToken || !title || !content || !language) {
            res.status(400).json({ error: 'Missing required fields.' });
            return false;
        }

        // Validate language (for simplicity, assume it's a string)
        if (typeof language !== 'string' || language.trim() === '') {
            res.status(400).json({ error: 'Invalid language.' });
            return false;
        }

        // Validate title (for simplicity, assume it's a string)
        if (typeof title !== 'string' || title.trim() === '') {
            res.status(400).json({ error: 'Invalid title.' });
            return false;
        }

        // Validate content (for simplicity, assume it's a string)
        if (typeof content !== 'string' || content.trim() === '') {
            res.status(400).json({ error: 'Invalid content.' });
            return false;
        }

        // Validate isPublic (should be boolean)
        if (typeof isPublic !== 'boolean') {
            res.status(400).json({ error: 'Invalid isPublic value.' });
            return false;
        }

        // Validate username (for simplicity, assume it's a string)
        if (typeof username !== 'string' || username.trim() === '') {
            res.status(400).json({ error: 'Invalid username.' });
            return false;
        }

        // Validate content length (for simplicity, assume max 10000 characters)
        if (content.length > 10000) {
            res.status(400).json({ error: 'Content too long. Maximum 10,000 characters.' });
            return false;
        }

        // Validate title length (for simplicity, assume max 200 characters)
        if (title.length > 200) {
            res.status(400).json({ error: 'Title too long. Maximum 200 characters.' });
            return false;
        }

        // Validate content does not contain disallowed characters (for simplicity, assume no HTML tags)
        const disallowedChars = /<|>|&/; // Example: disallow HTML tags
        if (disallowedChars.test(content)) {
            res.status(400).json({ error: 'Content contains disallowed characters.' });
            return false;
        }

        // Validate title does not contain disallowed characters (for simplicity, assume no HTML tags)
        if (disallowedChars.test(title)) {
            res.status(400).json({ error: 'Title contains disallowed characters.' });
            return false;
        }

        return true;
    }

    function ensureArticlesDirExists() {
        const articlesDir = path.join(__dirname, '../Data/Articles');
        if (!fs.existsSync(articlesDir)) {
            fs.mkdirSync(articlesDir, { recursive: true });
        }
    }

    function saveNewArticle({ guid, title, username, content, isPublic, language, llm, prompt, level, length }, res) {
        // Save article content as a .txt file
        const articlePath = path.join(__dirname, '../Data/Articles', `${guid}.txt`);
        fs.writeFile(articlePath, content, 'utf8', (err) => {
            if (err) {
                console.error('Error saving article:', err);
                return res.status(500).json({ error: 'Could not save article.' });
            }
        });

        // Save metadata in Data/articles.json
        const metaPath = path.join(__dirname, '../Data/articles.json');
        let articles = [];
        try {
            if (fs.existsSync(metaPath)) {
                articles = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            }
        } catch (e) {
            articles = [];
        }
        // Compose metadata object, including LLM fields if present
        const meta = {
            id: guid,
            title,
            user: username,
            public: !!isPublic,
            language,
            visible: true,
            createdAt: new Date().toISOString()
        };
        if (llm) meta.llm = true;
        if (prompt) meta.prompt = prompt;
        if (level) meta.level = level;
        if (length) meta.length = length;
        articles.push(meta);
        try {
            fs.writeFileSync(metaPath, JSON.stringify(articles, null, 2), 'utf8');
        } catch (e) {
            return res.status(500).json({ error: 'Could not save article metadata.' });
        }

        res.json({ success: true, id: guid });
    }

    function getAllArticles() {
        const metaPath = path.join(__dirname, '../Data/articles.json');
        let articles = [];
        try {
            if (fs.existsSync(metaPath)) {
                articles = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            }
        } catch (e) {
            articles = [];
        }
        return articles;
    }

    async function getUserLanguage(username) {
        try {
            const db = new JsonDB(new Config(path.join(__dirname, '../Data/users'), true, true, '/'));
            const user = await db.getData(`/${username}`);
            return user.language;
        } catch (e) {
            return null;
        }
    }

    function setArticlePublicStatus(articles, id, isPublic, username, res) {
        const metaPath = path.join(__dirname, '../Data/articles.json');
        const idx = articles.findIndex(a => a.id === id);
        if (idx === -1) {
            res.status(404).json({ error: 'Article not found.' });
            return false;
        }

        if (articles[idx].user !== username) {
            res.status(403).json({ error: 'Not allowed.' });
            return false;
        }

        articles[idx].public = !!isPublic;

        try {
            fs.writeFileSync(metaPath, JSON.stringify(articles, null, 2), 'utf8');
        } catch (e) {
            res.status(500).json({ error: 'Could not update article.' });
            return false;
        }
        return true;
    }

    async function deleteArticle(id, res) {
        const dbPath = path.join(__dirname, '../Data/articles');
        const db = new JsonDB(new Config(dbPath, true, true, '/'));
        try {
            // Check if article exists
            const article = await db.getData(`/${id}`);
            if (!article) {
                return res.status(404).json({ error: 'Article not found.' });
            }
            // Set visible to false
            await db.push(`/${id}/visible`, false, true);
            res.json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: 'Could not update article.' });
        }
    }

    app.get('/api/article', (req, res) => {

        const id = req.query.id;

        if (!isValidGuid(id)) {
            return res.status(400).json({ error: 'Invalid or missing article id.' });
        }

        const result = isArticleVisible(id);
        if (result.error) {
            return res.status(result.error.status).json({ error: result.error.message });
        }

        sendArticleContent(id, res);
    });

    app.post('/api/article/new', (req, res) => {
        const { username, sessionToken, title, content, isPublic, language } = req.body;

        if (!isSessionValid(username, sessionToken)) {
            res.status(403).json({ error: 'Invalid session.' });
            return;
        }

        if (!validateNewArticleInput({ username, sessionToken, title, content, isPublic, language }, res)) {
            return;
        }

        ensureArticlesDirExists();

        const guid = uuidv4();

        saveNewArticle({
            guid,
            title,
            username,
            content,
            isPublic,
            language
        }, res);
    });

    app.post('/api/articles', async (req, res) => {
        const { username, sessionToken } = req.body;

        if (!isSessionValid(username, sessionToken)) {
            res.status(403).json({ error: 'Invalid session.' });
            return;
        }

        const articles = getAllArticles();
        const userLanguage = await getUserLanguage(username);

        // User's own articles in their language
        const userArticles = username && userLanguage
            ? articles.filter(a => a.user === username && a.language === userLanguage && a.visible)
            : [];

        // Public articles in user's language (not owned by user)
        const publicArticles = userLanguage
            ? articles.filter(a => a.public && a.user !== username && a.language === userLanguage && a.visible)
            : [];

        res.json({ userArticles, publicArticles });
    });

    app.post('/api/article/setpublic', async (req, res) => {
        const { id, public: isPublic, username, sessionToken } = req.body;
        if (!id || typeof isPublic === 'undefined' || !username || !sessionToken) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        if (!isSessionValid(username, sessionToken)) {
            res.status(403).json({ error: 'Invalid session.' });
            return;
        }

        let articles = getAllArticles();

        if (!setArticlePublicStatus(articles, id, isPublic, username, res)) {
            return;
        }

        res.json({ success: true });
    });

    app.post('/api/article/delete', async (req, res) => {
        const { id, username, sessionToken } = req.body;
        if (!id || !username || !sessionToken) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        if (!isSessionValid(username, sessionToken)) {
            res.status(403).json({ error: 'Invalid session.' });
            return;
        }

        let articles = getAllArticles();

        const idx = articles.findIndex(a => a.id === id);
        if (idx === -1) {
            return res.status(404).json({ error: 'Article not found.' });
        }

        if (articles[idx].user !== username) {
            return res.status(403).json({ error: 'Not allowed.' });
        }

        await deleteArticle(idx, res);
    });

    // POST /api/article/llm
    app.post('/api/article/llm', async (req, res) => {
        const { username, sessionToken, language, prompt, level, length, isPublic } = req.body;
        if (!username || !sessionToken || !language || !prompt || !level || !length) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        if (!isSessionValid(username, sessionToken)) {
            res.status(403).json({ error: 'Invalid session.' });
            return;
        }

        const title = `${prompt} (${level}, ${length})`;
        const content = await llm.generateArticle({ prompt, language, level, length });
        const guid = require('uuid').v4();

        if (!validateNewArticleInput({ username, sessionToken, title, content, isPublic, language }, res)) {
            return;
        }

        ensureArticlesDirExists();

        saveNewArticle({
            guid,
            title,
            username,
            content,
            isPublic,
            language,
            llm: true,
            prompt,
            level,
            length
        }, res);

        res.json({ success: true, id: guid });
    });
};