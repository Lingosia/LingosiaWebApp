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
    }

};

module.exports = utils;