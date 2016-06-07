var when = require("when");
var request = require('request');
var getApiRoot = require('../../config').getApiRoot;

var IDM_BASE_URL = getApiRoot('xively.services.idm');

function validateJwt(accessToken, jwt) {
    return when.promise(function(resolve) {
       request.get({
          url: IDM_BASE_URL+'auth/validate-jwt?jwt='+jwt, 
          headers: {
            AccessToken: accessToken
          }
        }, 
        function(err,httpResponse,body){ 
          if(typeof body["statusCode"] != "undefined" && body["statusCode"] != 200){
            resolve(null); 
          }else{
            resolve(body["success"] === true);
          }
        });
   });  
}

function createUser(email,password,accountid,appId,accesstoken) {
    return when.promise(function(resolve) {
        request.post({
          url: IDM_BASE_URL+'auth/create-user', 
          headers: {
            AccessToken: accesstoken
          },
          form:{
            emailAddress: email,
            accountId: accountid,
            password: password,
            applicationId:appId,
          }
        },
        function(err,httpResponse,body){ 
          var resp = JSON.parse(body);
          resolve(resp);
        });
  });
}

function loginApplication(accountId, appId, accessToken) {
    return when.promise(function(resolve) {
       request.post({
          url: IDM_BASE_URL+'auth/login-application', 
          form: {
            appId:appId,
            appToken:accessToken,
            accountId:accountId
          }
        }, 
        function(err,httpResponse,body){ 
          if(typeof body["statusCode"] != "undefined" && body["statusCode"] != 200){
            resolve(null); 
          }else{
            resolve(JSON.parse(body));
          }
        });
   });
}

function loginUser(email, password, accountId) {
    return when.promise(function(resolve) {
       request.post({
          url: IDM_BASE_URL+'auth/login-user', 
          form: {
            emailAddress:email,
            password:password,
            accountId:accountId
          }
        }, 
        function(err,httpResponse,body){ 
          if(typeof body["statusCode"] != "undefined" && body["statusCode"] != 200){
            resolve(null); 
          }else{
            resolve(JSON.parse(body));
          }
        });
   });
}


module.exports = {
  	validateJwt: validateJwt,
    loginUser: loginUser,
    loginApplication : loginApplication,
    createUser: createUser
};