const llm = require('./article_llm.js');

module.exports = function(app) {
    const fs = require('fs');
    const path = require('path');
    const { v4: uuidv4 } = require('uuid');
    const { JsonDB, Config } = require('node-json-db');

    // GET /article
    app.get('/api/article', (req, res) => {
        const id = req.query.id;
        // GUID regex (simple version)
        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!id || !guidRegex.test(id)) {
            return res.status(400).json({ error: 'Invalid or missing article id.' });
        }

        // Check article is visible
        const metaPath = path.join(__dirname, '../Data/articles.json');
        let articles = [];
        try {
            if (fs.existsSync(metaPath)) {
                articles = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            }
        } catch (e) {
            return res.status(500).json({ error: 'Could not read articles metadata.' });
        }
        const article = articles.find(a => a.id === id && a.visible);
        if (!article) {
            return res.status(404).json({ error: 'Article not found or not visible.' });
        }
        
        // Read the article content from the file
        const filePath = path.join(__dirname, '../Data/Articles', `${id}.txt`);
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                res.status(500).json({ error: 'Could not read article.' });
            } else {
                res.send(data);
            }
        });
    });

    // POST /api/article/new
    app.post('/api/article/new', (req, res) => {
        const { username, sessionToken, title, content, isPublic, language } = req.body;
        if (!username || !sessionToken || !title || !content || !language) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        // Optionally: Validate sessionToken here (not implemented for brevity)

        // Generate GUID for the article
        const guid = uuidv4();

        // Check folder exists, create if not
        const articlesDir = path.join(__dirname, '../Data/Articles');
        if (!fs.existsSync(articlesDir)) {
            fs.mkdirSync(articlesDir, { recursive: true });
        }

        // Save article content as a .txt file
        const articlePath = path.join(__dirname, '../Data/Articles', `${guid}.txt`);
        fs.writeFile(articlePath, content, 'utf8', (err) => {
            if (err) {
                console.error('Error saving article:', err);
                return res.status(500).json({ error: 'Could not save article.' });
            }

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
            articles.push({
                id: guid,
                title,
                user: username,
                public: !!isPublic,
                language,
                visible: true,
                createdAt: new Date().toISOString(),
            });
            try {
                fs.writeFileSync(metaPath, JSON.stringify(articles, null, 2), 'utf8');
            } catch (e) {
                return res.status(500).json({ error: 'Could not save article metadata.' });
            }

            res.json({ success: true, id: guid });
        });
    });

    // POST /api/articles
    app.post('/api/articles', async (req, res) => {
        const { username, sessionToken } = req.body;
        // Optionally: Validate sessionToken here (not implemented for brevity)

        const metaPath = path.join(__dirname, '../Data/articles.json');
        let articles = [];
        try {
            if (fs.existsSync(metaPath)) {
                articles = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            }
        } catch (e) {
            articles = [];
        }

        // Get user's chosen language
        let userLanguage = null;
        try {
            const db = new JsonDB(new Config(path.join(__dirname, '../Data/users'), true, true, '/'));
            const user = await db.getData(`/${username}`);
            userLanguage = user.language;
        } catch (e) {
            userLanguage = null;
        }

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

    // POST /api/article/setpublic
    app.post('/api/article/setpublic', async (req, res) => {
        const { id, public: isPublic, username, sessionToken } = req.body;
        if (!id || typeof isPublic === 'undefined' || !username || !sessionToken) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        // Optionally: Validate sessionToken here (not implemented for brevity)

        const metaPath = path.join(__dirname, '../Data/articles.json');
        let articles = [];
        try {
            if (fs.existsSync(metaPath)) {
                articles = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            }
        } catch (e) {
            return res.status(500).json({ error: 'Could not read articles metadata.' });
        }

        const idx = articles.findIndex(a => a.id === id);
        if (idx === -1) {
            return res.status(404).json({ error: 'Article not found.' });
        }
        // Only allow user to update their own article
        if (articles[idx].user !== username) {
            return res.status(403).json({ error: 'Not allowed.' });
        }
        articles[idx].public = !!isPublic;
        try {
            fs.writeFileSync(metaPath, JSON.stringify(articles, null, 2), 'utf8');
        } catch (e) {
            return res.status(500).json({ error: 'Could not update article.' });
        }
        res.json({ success: true });
    });

    // POST /api/article/delete
    app.post('/api/article/delete', async (req, res) => {
        const { id, username, sessionToken } = req.body;
        if (!id || !username || !sessionToken) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        // Optionally: Validate sessionToken here (not implemented for brevity)

        const metaPath = path.join(__dirname, '../Data/articles.json');
        let articles = [];
        try {
            if (fs.existsSync(metaPath)) {
                articles = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            }
        } catch (e) {
            return res.status(500).json({ error: 'Could not read articles metadata.' });
        }

        const idx = articles.findIndex(a => a.id === id);
        if (idx === -1) {
            return res.status(404).json({ error: 'Article not found.' });
        }
        // Only allow user to delete their own article
        if (articles[idx].user !== username) {
            return res.status(403).json({ error: 'Not allowed.' });
        }
        articles[idx].visible = false;
        try {
            fs.writeFileSync(metaPath, JSON.stringify(articles, null, 2), 'utf8');
        } catch (e) {
            return res.status(500).json({ error: 'Could not update article.' });
        }
        res.json({ success: true });
    });

    // POST /api/article/llm
    app.post('/api/article/llm', async (req, res) => {
        const { username, sessionToken, language, prompt, level, length, isPublic } = req.body;
        if (!username || !sessionToken || !language || !prompt || !level || !length) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        // Optionally: Validate sessionToken here (not implemented for brevity)

        // Compose a fake article using the prompt, level, and length (replace with LLM integration as needed)
        // For now, just generate a simple article
        const title = `${prompt} (${level}, ${length})`;
        //const content = `This is an automatically generated article for "${prompt}" at level ${level} and length ${length} in ${language}.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. (Replace with LLM output.)`;

        const content = await llm.generateArticle({ prompt, language, level, length });

        // Generate GUID for the article
        const guid = require('uuid').v4();

        // Save article content as a .txt file
        const articlePath = path.join(__dirname, '../Data/Articles', `${guid}.txt`);
        fs.writeFile(articlePath, content, 'utf8', (err) => {
            if (err) {
                console.error('Error saving article:', err);
                return res.status(500).json({ error: 'Could not save article.' });
            }

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
            articles.push({
                id: guid,
                title,
                user: username,
                public: !!isPublic,
                language,
                visible: true,
                createdAt: new Date().toISOString(),
                llm: true,
                prompt,
                level,
                length
            });
            try {
                fs.writeFileSync(metaPath, JSON.stringify(articles, null, 2), 'utf8');
            } catch (e) {
                return res.status(500).json({ error: 'Could not save article metadata.' });
            }

            res.json({ success: true, id: guid });
        });
    });
};
