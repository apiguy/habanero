var when = require("when");
var request = require('request');

module.exports = {
   type: "credentials",
   users: function(username) {
       return when.promise(function(resolve) {
           // Do whatever work is needed to check username is a valid
           // user.
           if (true) {
               // Resolve with the user object. It must contain
               // properties 'username' and 'permissions'
               var user = { username: username, permissions: "*" };
               resolve(user);
           } else {
               // Resolve with null to indicate this user does not exist
               resolve(null);
           }
       });
   },
   authenticate: function(username, password, accountid) {
       return when.promise(function(resolve) {
           console.log("*************");
           console.log(username);
           console.log(password);
           console.log(accountid);

           request.post({
              url:'https://id.xively.com/api/v1/auth/login-user', 
              form: {
                emailAddress:username,
                password:password,
                accountId:accountid
              }
            }, 
            function(err,httpResponse,body){ 
              if(typeof body["statusCode"] != "undefined" && body["statusCode"] != 200){
                resolve(null); 
              }else{
                var user = { username: username, permissions: "*" };
                resolve(user);
              }
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