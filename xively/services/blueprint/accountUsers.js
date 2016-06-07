var when = require("when");
var request = require('request');

var getApiRoot = require('../../config').getApiRoot;
var BLUEPRINT_BASE_URL = getApiRoot('xively.services.blueprint');

var getAccountUsers = function(accountId, jwt, userId) {
    return when.promise(function(resolve) {
        request.get({
          url: BLUEPRINT_BASE_URL+'account-users', 
          headers: {
            Authorization: "Bearer "+ jwt
          },
          qs:{
            accountId: accountId,
            userId: userId

          }
        },
        function(err,httpResponse,body){ 
          var resp = JSON.parse(body);
          resolve(resp);
        });
  });
};

var postAccountUsers = function(accountId, jwt, userId) {
    //creates an account user
    return when.promise(function(resolve) {
        request.post({
          url: BLUEPRINT_BASE_URL+'account-users', 
          headers: {
            Authorization: "Bearer "+ jwt
          },
          form:{
            accountId: accountId,
            userId: userId
          }
        },
        function(err,httpResponse,body){ 
          var resp = JSON.parse(body);
          resolve(resp);
        });
  });
};

var putAccountUsers = function(id, userId, etag) {
    //updates an account user
    return when.promise(function(resolve) {
        request.put({
          url: BLUEPRINT_BASE_URL+'account-users/'+id, 
          headers: {
            AccessToken: accesstoken
          },
          form:{
            emailAddress: email,
            accountId: accountid,
            password: password
          }
        },
        function(err,httpResponse,body){ 
          var resp = JSON.parse(body);
          resolve(resp);
        });
  });
};


module.exports = {
    get: getAccountUsers,
    post: postAccountUsers,
  	put: putAccountUsers
};