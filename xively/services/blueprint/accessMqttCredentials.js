var when = require("when");
var request = require('request');

var getApiRoot = require('../../config').getApiRoot;
var BLUEPRINT_BASE_URL = getApiRoot('xively.services.blueprint');


var createMqttCredentials = function(accountId, jwt, entityType, entityId){
  return when.promise(function(resolve) {
        request.post({
          url: BLUEPRINT_BASE_URL+'access/mqtt-credentials', 
          headers: {
            Authorization: "Bearer "+ jwt
          },
          form:{
            accountId: accountId,
            entityId: entityId,
            entityType: entityType
          }
        },
        function(err,httpResponse,body){ 
          var resp = JSON.parse(body);
          resolve(resp);
        });
    });
}

module.exports = {
    create: createMqttCredentials
};