var when = require("when");
var request = require('request');

var getApiRoot = require('../../config').getApiRoot;
var BLUEPRINT_BASE_URL = getApiRoot('xively.services.blueprint');


var getOrganizations = function(accountId, jwt, parentId, page, pageSize) {
    return when.promise(function(resolve) {
        request.get({
          url: BLUEPRINT_BASE_URL+'organizations', 
          headers: {
            Authorization: "Bearer "+ jwt
          },
          qs:{
            accountId: accountId,
            count: "children",
            parentId: parentId || "null",
            page: page || 1,
            pageSize: pageSize || 100
          }
        },
        function(err,httpResponse,body){ 
          var resp = JSON.parse(body);
          resolve(resp);
        });
  });
};


module.exports = {
    get: getOrganizations
};