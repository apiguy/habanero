
var when = require('when');
var redis = require('redis'),
    client = redis.createClient();
var settings;
var log = require("../log");

client.on("error", function (err) {
    console.log("Error " + err);
});


function saveValue (key, value, defaultValue) {
    return when.promise(function(resolve) {
        console.log("Redis save");
        console.log(key);
        console.log(value);
        client.set(key, JSON.stringify(value), function(err, reply) {
            if (!err) {
                return resolve(defaultValue);
            }
            log.info("Redis ERROR: " + err);
            resolve(defaultValue);
        });
    });
}

function getValue(key, defaultValue) {
    return when.promise(function(resolve) {
        client.get(key, function(err, reply) {
            if (!err) {
                if (reply == null) {
                    return resolve(defaultValue);
                }
                return resolve(JSON.parse(reply));
            }
            log.info("Redis ERROR: " + err);
            return resolve(defaultValue);
        });
    });
}

module.exports = {
    init: function(_settings) {
        settings = _settings;

        
    },
    getFlows: function() {
        return getValue("flows", []);
    },
    saveFlows: function(flows) {
        if (settings.readOnly) {
            return when.resolve();
        }

        return saveValue("flows", flows, []);
    },
    getCredentials: function() {
        return getValue("credentials", {});
    },
    saveCredentials: function (credentials) {
        return saveValue("credentials", credentials, {});
    },
    getSettings: function() {
        return getValue("settings", {});
    },
    saveSettings: function() {
        return saveValue("settings", settings, {});
    },
    getSessions: function () {
        return getValue("sessions", {});
    },
    saveSessions: function(sessions) {
        return saveValue("sessions", sessions, {});
    },
    getLibraryEntry: function(type, name) {
        return getValue(type + "::" + name, {});
    },
    saveLibraryEntry: function(type, name, meta, body) {}
};