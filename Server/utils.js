const fs = require('fs');
const path = require('path');
const { JsonDB, Config } = require('node-json-db');

utils = {

    async isSessionValid(username, sessionToken) {

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
    },

    async getLoginAttemptLimit(username) {
        // Retrieve rate limit data for the user from users.json
        const dbPath = path.join(__dirname, '../Data/users.json');
        if (!fs.existsSync(dbPath)) {
            return { limit: 0, remaining: 0, reset: 0 };
        }
        const db = new JsonDB(new Config(dbPath, true, true, '/'));
        try {
            const user = await db.getData(`/${username}`);

            if (!user.rateLimit) {
                userLimit = {
                    limit: 0,
                    remaining: 0,
                    reset: 0
                };
                await db.push(`/${username}/rateLimit`, userLimit);
            }

            // Check if rate limit is expired
            if (user.rateLimit.reset < Date.now()) {
                // Reset rate limit
                user.rateLimit.limit = 5; // Reset to default limit
                user.rateLimit.remaining = 5; // Reset remaining attempts
                user.rateLimit.reset = Date.now() + 3600000; // Reset after 1 hour
                await db.push(`/${username}/rateLimit`, user.rateLimit);
            }

            // Consume one attempt
            if (user.rateLimit.remaining > 0) {
                user.rateLimit.remaining -= 1;
                await db.push(`/${username}/rateLimit`, user.rateLimit);
            }

            return {
                limit: user.rateLimit.limit || 0,
                remaining: user.rateLimit.remaining || 0,
                reset: user.rateLimit.reset || 0
            };
        }
        catch (e) {
            return { limit: 0, remaining: 0, reset: 0 };
        }
    }

};

module.exports = utils;