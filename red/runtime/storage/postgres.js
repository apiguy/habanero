var when = require('when');
var createKnex = require('knex');
var log = require("../log");

var schema = "habanero";
var storageTable = "storage";

var knex = createKnex({
  client: 'pg',
  connection: process.env.DATABASE_URL
});

function setupTables(){
    return when.promise(function(resolve) {   
        var CREATE_SCHEMA_Q = `CREATE SCHEMA IF NOT EXISTS ${schema}`;
        knex.raw(CREATE_SCHEMA_Q).then(function(createSchemaResp){
        	knex.schema.withSchema(schema).createTableIfNotExists(storageTable, function (table) {
        	  table.string('key_name');
        	  table.jsonb('data');
        	}).then(function(createTableResp){
                resolve();
        	});
        });
        resolve();
    });
}


function saveValue (key, value, defaultValue) {
    return when.promise(function(resolve) {
    	var data = JSON.stringify(value);
    	knex.withSchema(schema).from(storageTable)
		.where('key_name', key)
		.update({
			data: data
		}).then((updateResp) => {
            if(updateResp === 0){
                knex.withSchema(schema).from(storageTable)
                .insert({
                    'key_name':key,
                    data: data
                }).then(function(insertResp){
                    return resolve(true);
                })
            }else{
                resolve(true);
            }
		});
    });
}

function getValue(key, defaultValue) {
    return when.promise(function(resolve) {
    	knex.withSchema(schema).select('data').from(storageTable).where('key_name', key).then(function(rows) {
    		if(rows.length < 1){
    			resolve(defaultValue);
    		}else{
                if(typeof rows[0] == 'undefined'){
                    return resolve(defaultValue);
                }
    			resolve(JSON.parse(rows[0].data));
    		}
    	});
    });
}

module.exports = {
    init: function(_settings) {
        settings = _settings;
        return setupTables();
    },
    getValue: getValue,
    saveValue: saveValue,
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
        return getValue(type + "::" + name, []);
    },
    saveLibraryEntry: function(type, name, meta, body) {}
};