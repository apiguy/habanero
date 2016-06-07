var adminAuth = require("./adminAuth");
var auth = require("./auth");
var settings = require("./settings");



var isHabaneroInstance = function(){
    //always assume true until this package can be deployed independently
    return true;
};

module.exports = {
    //node-red adminAuth
    //http://nodered.org/docs/security
    adminAuth: adminAuth,
    //end adminAuth

    auth: auth,
    isHabaneroInstance: isHabaneroInstance,
    settings: settings
}