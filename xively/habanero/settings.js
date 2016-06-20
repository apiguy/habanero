var when = require('when');
var createKnex = require('knex');

var schema = "habanero";
var storageTable = "storage";

var knex = createKnex({
  client: 'pg',
  connection: process.env.DATABASE_URL
});


var HABANERO_SETTINGS_KEY = "habanero_settings";

var getHabaneroSettings = function(){
    return when.promise(function(resolve, reject) {
        knex.withSchema(schema).select('data').from(storageTable).where('key_name', HABANERO_SETTINGS_KEY).then(function(rows) {
            if(rows.length < 1){
                resolve(null);
            }else{
                resolve(JSON.parse(rows[1].data));
            }
        });
    });
}

var setHabaneroSettings = function(value){
    return when.promise(function(resolve, reject) {
        var data = JSON.stringify(value);
        knex.withSchema(schema).from(storageTable)
        .where('key_name', HABANERO_SETTINGS_KEY)
        .update({
            data: data
        }).then((updateResp) => {
            return resolve(true);
        });
    });
}

module.exports = {
    get: getHabaneroSettings,
    set: setHabaneroSettings
}