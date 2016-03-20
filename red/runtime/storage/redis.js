
var when = require('when');
var redis = require('redis'),
    client = redis.createClient({
        url: process.env.REDIS_URL
    });
var settings;
var log = require("../log");

client.on("error", function (err) {
    console.log("Error " + err);
});


function saveValue (key, value) {
    return when.promise(function(resolve) {
        client.set(key, JSON.stringify(value), function(err, reply) {
            if (!err) {
                resolve([]);
            }
            log.info("Redis ERROR: " + err);
            resolve([]);
        });
    });
}

function getValue(key) {
    return when.promise(function(resolve) {
        client.get(key, function(err, reply) {
            if (!err) {
                if (reply == null) {
                    return resolve([]);
                }
                return resolve(JSON.parse(reply));
            }
            log.info("Redis ERROR: " + err);
            return resolve([]);
        });
    });
}

module.exports = {
    init: function(_settings) {
        settings = _settings;

        
    },
    getFlows: function() {
        return getValue("flows");
    },
    saveFlows: function(flows) {
        if (settings.readOnly) {
            return when.resolve();
        }

        return saveValue("flows", flows);
    },
    getCredentials: function() {
        return getValue("credentials");
    },
    saveCredentials: function (credentials) {
        return saveValue("credentials", credentials);
    },
    getSettings: function() {
        return getValue("settings");
    },
    saveSettings: function() {
        return saveValue("settings", settings);
    },
    getSessions: function () {
        return getValue("sessions");
    },
    saveSessions: function(sessions) {
        return saveValue("sessions", sessions);
    },
    getLibraryEntry: function(type, name) {
        return getValue(type + "::" + name);
    },
    saveLibraryEntry: function(type, name, meta, body) {}
};