// node-red security
// http://nodered.org/docs/security
var when = require("when");
var auth = require('./auth');

var habaneroSettings = require('./settings');

module.exports = {
    type: "credentials",
    users: function(username) {
        return when.promise(function(resolve) {
            // currently if you're logged in, we let you have full permission in red editor
            var user = {
                username: username,
                permissions: "*"
            };
            resolve(user);
        });
    },

    authenticate: function(username, password, requestBody) {
        var accountId   = requestBody["accountId"];
        var appId       = (requestBody["appId"] == "") ? process.env.XIVELY_IDM_APP_ID : requestBody["appId"];
        var accessToken = (requestBody["accessToken"] == "") ? process.env.XIVELY_IDM_APP_TOKEN : requestBody["accessToken"];
        var loggedInUserJwt;
        return when.promise(function(resolve) {
            habaneroSettings.get().then(function(hSettings) {
                // if we have valid habanero settings
                // use the settings.accountId for login attempts
                var habaneroIsSetup = hSettings !== null;
                if (habaneroIsSetup) {
                    accountId = hSettings.accountId;
                }

                auth.loginUser(username, password, accountId).then(function(loginResp) {
                    if (loginResp === null || !loginResp.hasOwnProperty('jwt')) {
                        // error logging in
                        return resolve(null);
                    }

                    // login successfull
                    loggedInUserJwt = loginResp["jwt"];
                    // verify its an account-user
                    return auth.isAccountUser(loggedInUserJwt);
                }).then(function(isAccountUser){
                    if(!isAccountUser){
                        // account-user required
                        // failed login
                        resolve(null);
                    }

                    // valid account-user
                    
                    var resolveLogin = function() {
                        var user = {
                            username: username,
                            permissions: "*"
                        };
                        resolve(user);
                    };
                    
                    if (!habaneroIsSetup) {
                        // need to setup habanero creds
                        auth.setupHabaneroAuth(loggedInUserJwt, accountId, appId, accessToken, requestBody)
                            .then(resolveLogin)
                            .catch(function(err) {
                                console.log("Unable to setup Xi Credentials");
                                resolve(null);
                            });
                    } else {
                        // habanero is already setup, resolve the login
                        resolveLogin();
                    }
                });
            });
        });
    },

    default: function() {
        return when.promise(function(resolve) {
            // Do not allow anonymous login
            resolve(null);
        });
    }
}