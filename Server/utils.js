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
    },

    async getIpAddressLimit(ipAddress) {
        // Retrieve rate limit data for the IP address from ip_addresses.json
        const dbPath = path.join(__dirname, '../Data/ip_addresses.json');
        if (!fs.existsSync(dbPath)) {
            // If the file does not exist, create it with an empty object
            fs.writeFileSync(dbPath, '{}');
        }
        const db = new JsonDB(new Config(dbPath, true, true, '/'));
        try {
            // Check if the IP address exists in the database
            let ipLimit = {
                limit: 0,
                remaining: 0,
                reset: 0
            };
            if (!await db.exists(`/${ipAddress}`)) {
                // If the IP address does not exist, create it with default rate limit values
                ipLimit = {
                    limit: 20, // Default limit
                    remaining: 20, // Default remaining attempts
                    reset: Date.now() + (3600000 * 3) // Reset after 3 hours
                };
                await db.push(`/${ipAddress}`, { rateLimit: ipLimit });
            }
            // Retrieve the rate limit data for the IP address
            const ipData = await db.getData(`/${ipAddress}`);

            if (!ipData.rateLimit) {
                ipLimit = {
                    limit: 0,
                    remaining: 0,
                    reset: 0
                };
                await db.push(`/${ipAddress}/rateLimit`, ipLimit);
            }

            // Check if rate limit is expired
            if (ipData.rateLimit.reset < Date.now()) {
                // Reset rate limit
                ipData.rateLimit.limit = 20; // Reset to default limit
                ipData.rateLimit.remaining = 20; // Reset remaining attempts
                ipData.rateLimit.reset = Date.now() + 3600000; // Reset after 1 hour
                await db.push(`/${ipAddress}/rateLimit`, ipData.rateLimit);
            }

            // Consume one attempt
            if (ipData.rateLimit.remaining > 0) {
                ipData.rateLimit.remaining -= 1;
                await db.push(`/${ipAddress}/rateLimit`, ipData.rateLimit);
            }

            return {
                limit: ipData.rateLimit.limit || 0,
                remaining: ipData.rateLimit.remaining || 0,
                reset: ipData.rateLimit.reset || 0
            };
        }
        catch (e) {
            console.error(`Error retrieving rate limit for IP ${ipAddress}:`, e);
            return { limit: 0, remaining: 0, reset: 0 };
        }
    },

    async getAiLimit(ipAddress) {
        // Retrieve AI usage limit data for the IP address from ip_addresses.json
        const dbPath = path.join(__dirname, '../Data/ip_addresses.json');
        if (!fs.existsSync(dbPath)) {
            // If the file does not exist, create it with an empty object
            fs.writeFileSync(dbPath, '{}');
        }
        const db = new JsonDB(new Config(dbPath, true, true, '/'));
        try {
            // Check if the IP address exists in the database
            let ipLimit = {
                limit: 0,
                remaining: 0,
                reset: 0
            };
            if (!await db.exists(`/${ipAddress}`)) {
                // If the IP address does not exist, create it with default AI usage values
                ipLimit = {
                    limit: 10, // Default limit for AI usage
                    remaining: 10, // Default remaining AI usage
                    reset: Date.now() + (3600000 * 24) // Reset after 24 hours
                };
                await db.push(`/${ipAddress}`, { aiLimit: ipLimit });
            }
            // Retrieve the AI usage limit data for the IP address
            const ipData = await db.getData(`/${ipAddress}`);

            if (!ipData.aiLimit) {
                ipLimit = {
                    limit: 0,
                    remaining: 0,
                    reset: 0
                };
                await db.push(`/${ipAddress}/aiLimit`, ipLimit);
            }

            // Check if AI usage limit is expired
            if (ipData.aiLimit.reset < Date.now()) {
                // Reset AI usage limit
                ipData.aiLimit.limit = 10; // Reset to default limit
                ipData.aiLimit.remaining = 10; // Reset remaining AI usage
                ipData.aiLimit.reset = Date.now() + (3600000 * 24); // Reset after 24 hours
                await db.push(`/${ipAddress}/aiLimit`, ipData.aiLimit);
            }

            // Consume one AI usage attempt
            if (ipData.aiLimit.remaining > 0) {
                ipData.aiLimit.remaining -= 1;
                await db.push(`/${ipAddress}/aiLimit`, ipData.aiLimit);
            }

            return {
                limit: ipData.aiLimit.limit || 0,
                remaining: ipData.aiLimit.remaining || 0,
                reset: ipData.aiLimit.reset || 0
            };
        }
        catch (e) {
            console.error(`Error retrieving AI limit for IP ${ipAddress}:`, e);
            return { limit: 0, remaining: 0, reset: 0 };
        }
    }

};

module.exports = utils;