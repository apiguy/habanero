var when = require("when");
var request = require('request');
var uuid = require('node-uuid');
var redis = require('redis'),
    redisClient = redis.createClient({
        url: process.env.REDIS_URL
    });

redisClient.on("error", function (err) {
    console.log("Error " + err);    
});

var idm = require('../services/idm');
var blueprint = require('../services/blueprint');
var habaneroSettings = require('./settings');

var getRed = function(){
    try{
        var RED = require("../../red/runtime");
    }catch(err){
        console.log(err)
        try{
            // running embedded
            var RED = require('node-red-habanero');
        }catch(err){
            console.error("Unable to import RED runtime");
        }
    }
    return RED;
}

var cachedJwts = {};

var getJwtForCredentialsId = function(credsId){
    var RED = getRed();
    return when.promise(function(resolve, reject) {
        function getCredsId() {
            return when.promise(function(res, rej) {
                if(credsId === null){
                    habaneroSettings.get().then(function(settings){
                        res(settings.credsId);
                    });
                }else{
                    res(credsId);
                }
            });
        }

        getCredsId().then((credentialsId) => {
            if(cachedJwts[credentialsId]){
                var jwtConfig = cachedJwts[credentialsId];
                var now  = new Date();
                //check if its been 15 minutes since getting jwt
                var expiration = new Date(jwtConfig.obtained.getTime() + 15*60000);
                if(now < expiration){
                    return resolve(cachedJwts[credentialsId]);
                }
            }
            //need to go log in with credentials
            var creds = RED.nodes.getCredentials(credentialsId);
            loginUser(creds.username, creds.password, creds.account_id).then(function(loginResp){
                if(loginResp == null || !loginResp.hasOwnProperty('jwt')){
                    return reject("Error loggin in with user: "+creds.username);
                }

                //cache the result
                cachedJwts[credentialsId] = {
                    obtained: new Date(),
                    jwt: loginResp["jwt"],
                    account_id: creds.account_id
                };
                return resolve(cachedJwts[credentialsId]);
            }).catch(function(err){
                return reject("Unkown error: "+err);
            });
        });
    });

};

var createHabaneroIdmUser = function(xiAccountId, xiAppId, xiAccessToken){
    return when.promise(function(resolve, reject) {
        var loop = 1;
        var pw = uuid.v4();
        var email = null;

        console.log("yyy")
        console.log(xiAccessToken);

        function createUser(){
            email = "habanero_"+loop+"@"+xiAccountId+".com";
            return idm.auth.createUser(email, pw, xiAccountId, xiAppId, xiAccessToken).then(function(resp){
                console.log(resp)
                if(resp['emailAddress'] === email){
                    resolve({email:email, password:pw, userId:resp["userId"]});
                }else{
                    loop++;
                    if(loop>75){
                        return reject("too many habanero users");
                    }
                    return createUser();
                }
            });
        }
        createUser().then(resolve);
    });
};

var setupDefaultFlows = function(habaneroIdmUser, requestBody){
    var RED = getRed();
    return when.promise(function(resolve, reject) {
        var credsId = RED.util.generateId();
        var defaultFlows = require('./defaultFlows/airFilterFlows.json');
        var flows = [];
        defaultFlows.forEach(function(node, index, array){
            if(node.type == "xively-user-credentials"){
                node.id = credsId;
            }else if(node.type == 'salesforce'){
                // provision salesforce credentials
                if(requestBody.SALESFORCE_USER &&
                    requestBody.SALESFORCE_PASSWORD &&
                     requestBody.SALESFORCE_TOKEN){
                    var sfCredsId = RED.util.generateId();
                    node.id = sfCredsId;
                    node.username = requestBody.SALESFORCE_USER;
                    RED.nodes.addCredentials(sfCredsId, {
                        token: requestBody.SALESFORCE_TOKEN,
                        password: requestBody.SALESFORCE_PASSWORD
                    });
                }else{
                    //remove salesforce crednetials node
                    node = null;
                }

            }else if(node.hasOwnProperty("xively_creds")){
                node.xively_creds = credsId;
            }
            if(node !== null){
                flows.push(node);
            }
        });
        RED.nodes.addCredentials(credsId, habaneroIdmUser);
        RED.nodes.setFlows(flows, "full");
        habaneroSettings.set({credsId:credsId, accountId:habaneroIdmUser.account_id}).then(function(settingsSaved){
            resolve();
        });
    });
};



var setupHabaneroAuth = function(jwt, xiAccountId, xiAppId, xiAccessToken, requestBody){
    var RED = getRed();
    var habaneroIdmUserCreds = { creds_name: "OrchestratorUser", account_id: xiAccountId };
    return when.promise(function(resolve, reject) {
        when.promise(function(r) {
            if(requestBody.FROM_CONCARIA === "true"){
                // use concaria user
                habaneroIdmUserCreds.user_id = requestBody.XIVELY_ACCOUNT_USER_IDM_ID;
                habaneroIdmUserCreds.username = requestBody.username;
                habaneroIdmUserCreds.password = requestBody.password;
                return r({accountUser:{id:requestBody.XIVELY_ACCOUNT_USER_BP_ID}});
                
            }else{
                // need to create new account user
                createHabaneroIdmUser(xiAccountId, xiAppId, xiAccessToken).then(function(idmUser){
                    habaneroIdmUserCreds.user_id = idmUser.userId;
                    habaneroIdmUserCreds.username = idmUser.email;
                    habaneroIdmUserCreds.password = idmUser.password;
                    return blueprint.accountUsers.post(xiAccountId, jwt, idmUser.userId).then(r);
                });
            }
        }).then(function(createAccountUserResp){
            habaneroIdmUserCreds.account_user_id = createAccountUserResp.accountUser.id;

            return blueprint.accessMqttCredentials.create(
                xiAccountId, 
                jwt,
                "accountUser",
                habaneroIdmUserCreds.account_user_id);

        }).then(function(mqttCreateResp){
            habaneroIdmUserCreds.mqtt_secret = mqttCreateResp.mqttCredential.secret;

            return setupDefaultFlows(habaneroIdmUserCreds, requestBody);

        }).then(function(){
            RED.log.info("Successfully setup habanero user: "+habaneroIdmUserCreds.username);

            return resolve(habaneroIdmUserCreds);
        }).catch(function(err){
            console.log("setupXiAuth err: "+err);
            reject(err);
        });
    });
};

var loginUser = function(username, password, accountId){
    return idm.auth.loginUser(username, password, accountId);
};

var isAccountUser = function(jwt){
    return when.promise(function(resolve, reject) {
        var jwtParts = jwt.split('.');
        var jwtJsonStr = new Buffer(jwtParts[1], 'base64').toString('ascii');
        var jwtInfo = JSON.parse(jwtJsonStr);

        blueprint.accountUsers.get(jwtInfo.accountId, jwt, jwtInfo.userId).then(function(getUserResp){
            resolve((getUserResp.accountUsers.results.length > 0));
        }).catch(function(err){
            reject(err);
        });
    });
};

module.exports = {
    loginUser:loginUser,
    isAccountUser : isAccountUser,
    getJwtForCredentialsId: getJwtForCredentialsId,
    setupHabaneroAuth: setupHabaneroAuth
};