var express = require('express');

var app = express();
var handlebars = require('express-handlebars').create({defaultLayout:'main'});
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');
var request = require('request');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');
var flash = require('connect-flash');
var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    TwitterStrategy = require('passport-twitter'),
    GoogleStrategy = require('passport-google'),
    FacebookStrategy = require('passport-facebook');

var mysql = require('mysql');
var connection = mysql.createConnection({
  host: 'sql3.freemysqlhosting.net',
  user: 'sql3170049',
  port: '3306',
  password: 'GMYiAtc2mV',
  database: 'sql3170049'
});

var email   = require('emailjs');
var server  = email.server.connect({
   user:    "reticulumcs467@gmail.com", 
   password:"zjoyclakyknditzr", 
   host:    "smtp.gmail.com", 
   ssl:     true
});

var pdf = require('handlebars-pdf');
var Promise = require('promise');

connection.query('SELECT * from users', function(err, rows, fields) {
  if (!err)
    console.log('The solution is: ', rows);
  else
    console.log('Error while performing Query.');
});
/*
var getConnection = function(callback) {
    pool.getConnection(function(err, connection) {
        if (err) {
          throw(err);
        } else {
          console.log('not an error');
        }
        connection.release();
    });
};
*/
//===============EXPRESS================

app.use(express.static('public'));
app.use(flash());
//app.use(logger('combined'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: 'supernova', saveUninitialized: true, resave: true}));


//===============PASSPORT===============
// used to serialize the user for the session
//passport.serializeUser(function(user, done) {
//  done(null, user.UserID);
//});
// used to deserialize the user
//passport.deserializeUser(function(id, done) {
//  connection.query("select * from users where UserID = ?",[id],function(err,rows){
//    console.log('de rows' + rows);
//    done(err, rows[0]);
//  });
//});
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

app.use(passport.initialize());
app.use(passport.session());

passport.use('local-signup', new LocalStrategy({
    // by default, local strategy uses username and password, we will override with email
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback
  },

  function(req, email, password, done) {

    // find a user whose email is the same as the forms email
    // we are checking to see if the user trying to login already exists
    connection.query("select * from login where email = ?", [email],function(err,rows){
      console.log(rows);
      console.log("above row object");
      if (err)
        return done(err);
      if (rows.length) {
        req.session.error = 'That username is already in use, please try a different one.'; //inform user could not log them in
        return done(null, false, req.session.error, req.flash('signupMessage', 'That e-mail is already taken.'));
      } else {
        // if there is no user with that email
        // create the user
        var newUserMysql = new Object();

        newUserMysql.email = email;
        newUserMysql.password = password; // use the generateHash function
        newUserMysql.fname = req.body.fname;
        newUserMysql.lname = req.body.lname;
        newUserMysql.isAdmin = 0;

        var insertQuery = "INSERT INTO login ( email, password, isAdmin) values (?, ?, ?)";
		    var insertUsersQuery = "INSERT INTO users ( userID, regionID, fname, lname ) values (?, ?, ?, ?)";
        //console.log(insertQuery);

        // ALSO INSERT TIME CREATED
        connection.query(insertQuery, [email, password, 0], function(err,rows){
          if (err)
            return done(err);
          newUserMysql.id = rows.insertId;
          connection.query(insertUsersQuery, [newUserMysql.id, req.body.rid, req.body.fname, req.body.lname], function(err,rows){
            if (err)
              return done(err);
            connection.query("select * from login where UserID = ?", [newUserMysql.id],function(err,rows){
              if (err)
                return done(err);

              return done(null, rows[0]);
            });
          });
        });
      }
    });
  })
);

//user login strategy
passport.use('local-signin', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, email, password, done) { // callback with email and password from our form
            connection.query("select * from login where email = ?", [email],function(err,rows){
                console.log(rows);
                if (err) {
                    console.log('error');
                    return done(err);
                } if (!rows.length) {
                    console.log('no user');
                    return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash
                }

                // if the user is found but the password is wrong
                if (password != rows[0].password) {//(!bcrypt.compareSync(password, rows[0].password)) {
                    console.log('bad pass');
                    return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata
                }
                // all is well, return successful user
                console.log('OK');
                return done(null, rows[0]);
            });
        })
);

// Session-persisted message middleware
app.use(function(req, res, next){
  var err = req.session.error,
      msg = req.session.notice,
      success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.success = success;

  next();
});


app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
//app.set('port', 50000);
// aws needs port set up this way. comment/uncomment as needed
app.set('port', process.env.PORT || 3000);


//===============ROUTES===============

app.get('/', function(req, res) {
  if(req.user)
	{
    if(!req.user.isAdmin) {
      connection.query('SELECT * FROM users where userID = ?', [req.user.UserID], function(err, rows){
        if(err){
          next(err);
          return;
        }
        console.log(rows);
        loggedin = rows[0];
        if(loggedin.signature.length == 0) {
          loggedin.signature = "https://drive.google.com/uc?id=0B_4RP0qw1BEIa3dCT0tVa3c3WHM";
        }
        res.render('home', {user: req.user, userinfo: loggedin});
      });
    }
    else {
      connection.query('SELECT * FROM admins where adminID = ?', [req.user.UserID], function(err, rows){
        if(err){
          next(err);
          return;
        }
        console.log(rows);
        adminloggedin = rows[0];
        res.render('home', {user: req.user, admininfo: adminloggedin});
      });
    }
  }
  else
    {res.render('home');}
});

//displays our signup page
app.get('/signin', function(req, res, next){
  var regionQuery = "SELECT * FROM regions";
  connection.query(regionQuery, function(err,rows){
    if(err){
      next(err);
      return;
    }
    res.render('signin', { regions: rows, msg: req.flash('signupMessage'), msg: req.flash('loginMessage')});
  });
});
//sends the request through our local signup strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/local-reg', passport.authenticate('local-signup', {
	

  successRedirect: '/',
  failureRedirect: '/signin'
  })
);

//displays reset password page
app.get('/resetPass', function(req, res){
  res.render('resetPass');
});

app.post('/newPass', function(req, res){
  connection.query('SELECT * FROM login WHERE email = ?', [req.body.acctEmail], function(err, rows){
    if(err){
      next(err);
      return;
    }

    //check if length is greater than 0, if not return message to user about no email found
    if (rows.length) {
      login = rows[0];

      var randPass = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for(var i = 0; i < 8; i++) {
        randPass += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      console.log(login.UserID);
      console.log(randPass);

      connection.query("UPDATE login SET password=? WHERE UserID =?", [randPass, login.UserID], function(err, result){
        if(err){
          next(err);
          return;
        }
        server.send({
          text:    "New password for Reticulum Account: " + randPass, 
          from:    "reticulumcs467@gmail.com", 
          to:      login.email,
          subject: "A Change Has Been Made To Your Reticulum Account"
        }, function(err, message) { console.log(err || message); });
      });

      var status = "Email Sent With New Password";
      res.render('resetRedirect', {notify: status});
    }
    else {
      var status = "No User Found";
      res.render('resetRedirect', {notify: status});
    }
  });
});

//sends the request through our local login/signin strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/login', passport.authenticate('local-signin', {
  successRedirect: '/',
  failureRedirect: '/signin',
  failureFlash : true
  }),
  function(req, res) {
            console.log("hello");

            if (req.body.remember) {
              req.session.cookie.maxAge = 1000 * 60 * 3;
            } else {
              req.session.cookie.expires = false;
            }
        res.redirect('/');
  }
);

//logs user out of site, deleting them from the session, and returns to homepage
app.get('/logout', function(req, res){
  if(req.user) {
    var uname = req.user.email;
    console.log("LOGGIN OUT " + uname);
    req.logout();
    res.redirect('/');
    req.session.notice = "You have successfully been logged out " + uname + "!";
  }
  else
    {res.render('home');}
});


app.get('/createNewAward', function(req, res) {
 if(req.user) {
  connection.query('SELECT * FROM users where userID = ?', [req.user.UserID], function(err, rows){
    if(err){
      next(err);
      return;
    }
    loggedin = rows[0];
    // search for all employees
    var uQuery = "SELECT * FROM users";
    connection.query(uQuery, function(err,rows){
      if(err){
        next(err);
        return;
      }
      users = rows;
      var typeQuery = "SELECT * FROM certtypes";
      connection.query(typeQuery, function(err,rows){
        if(err){
          next(err);
          return;
        }
        res.render('createNewAward', {user: req.user, users: users, userinfo: loggedin, type: rows});
      });
    });
  });
 }
 else
  {res.render('home');}
});

app.post('/newAward', function(req, res, next) {
  
  var awardQuery = "INSERT IGNORE INTO empcerts (`userID`, `certID`, `dateAwarded`, `issuerID`) VALUES (?, ?, ?, ?)";
  connection.query(awardQuery, [req.body.uid, req.body.certType, req.body.timedate, req.user.UserID], function(err,rows){
    if(err){
      next(err);
      return;
    }
  });
  res.redirect('/');
});

app.get('/changeName', function(req, res, next) {
  if(req.user)
  {
    connection.query('SELECT * FROM users where userID = ?', [req.user.UserID], function(err, rows){
      if(err){
	       next(err);
	       return;
      }
      loggedin = rows[0];
      var ID = req.user.UserID;
      connection.query('SELECT fname, lname, signature FROM users WHERE userID = ?', [ID], function(err, rows){
        if(err){
          next(err);
          return;
        }
        var hasSig = 1;
        var noSig = "https://drive.google.com/uc?id=0B_4RP0qw1BEIa3dCT0tVa3c3WHM";
        name = rows[0];
        if(name.signature.length == 0) {
          hasSig = 0;
        }
        res.render('changeName', {user: req.user, name: name, userinfo: loggedin, signature: name, hasSig: hasSig, noSig: noSig});
      });
    });
  }
  else
    {res.render('home');}
});

app.get('/deleteAward', function(req, res, next) {
    //var awardQuery = "SELECT * FROM empcerts";
    //connection.query('SELECT users.userID, empCertID, users.fname, users.lname, regions.regionName, dateAwarded, certtypes.name FROM certtypes INNER JOIN empcerts ON empcerts.certID = certtypes.certID INNER JOIN users on users.userID = empcerts.userID GROUP BY empCertID', function(err, rows){
 if(req.user) {
  connection.query('SELECT * FROM users where userID = ?', [req.user.UserID], function(err, rows){
    if(err){
      next(err);
      return;
    }
    loggedin = rows[0];
  
    connection.query('SELECT * FROM certtypes INNER JOIN empcerts on empcerts.certID = certtypes.certID INNER JOIN users on users.userID = empcerts.userID GROUP BY empcerts.empCertID', function(err, rows){
      if(err){
        next(err);
        return;
      }
      res.render('deleteAward', {user: req.user, userinfo: loggedin, awards: rows});
    });
  });
 }
 else
  {res.render('home');}
});

//send award winner's email
app.get('/sendAward', function(req, res, next) {
 if(req.user) {
  //connection.query('SELECT * FROM empcerts WHERE empCertID = ?', [req.query.sentid], function(err, rows){
    connection.query('SELECT * FROM certtypes INNER JOIN empcerts on empcerts.certID = certtypes.certID INNER JOIN users on users.userID = empcerts.userID WHERE empCertID = ? GROUP BY empcerts.empCertID', [req.query.sentid], function(err, rows){
    if(err){
      next(err);
      return;
    }
    award = rows[0];

    connection.query('SELECT * FROM login WHERE UserID = ?', [award.userID], function(err, rows){
      if(err){
        next(err);
        return;
      }
      winner = rows[0];
      connection.query('SELECT * FROM users WHERE userID = ?', [award.issuerID], function(err, rows){
        if(err){
          next(err);
          return;
        }
        issuer = rows[0];

        var awardpath = "./awards/award_"+Math.random()+".pdf"
        var document = {
            template: '</br></br></br></br></br><h3 align="center">{{msg1}}</h3></br><h1 align="center">{{msg2}}</h1><h3 align="center">{{msg4}}</h3>'+
            '</br></br></br></br></br></br></br></br></br></br></br></br><img align="right" height="60" width="168" style="margin-right:10em;" src={{sig}} />'+
            '</br></br></br><h6 align="right" style="margin-right:10em;">{{msg5}}</h6>'+
            '<h6 align="right" style="margin-right:10em;">{{msg3}}</h6>',
            context: {
            msg1: 'Reticulum Awards',
            msg2: award.name,
            msg3: award.dateAwarded,
            msg4: "to " + award.fname + " " + award.lname,
            msg5: issuer.fname + " " + issuer.lname,
            sig: issuer.signature
            },
            path: awardpath
        }
 
        pdf.create(document)
          .then(res => {
            console.log(res)
            server.send({
              text:    "Congratulations " + award.fname + " " + award.lname + ", you have won the following award at Reticulum - " + award.name + " - for the following time period: " + award.dateAwarded + ". Award Issued By: " + issuer.fname + " " + issuer.lname, 
              from:    "reticulumcs467@gmail.com", 
              to:      winner.email,
              subject: "You have been awarded by Reticulum",
              attachment: 
              [
                {data:"<html>Your Award</html>", alternative:true},
                {path:awardpath, type:"application/pdf", name:"award.pdf"}
              ]
            }, function(err, message) { console.log(err || message); });

          })
          .catch(error => {
            console.error(error)
          })
          res.redirect('/awardRedirect');
      });
    });
  });
 }
 else
  {res.render('home');}
});

app.get('/awardRedirect', function(req, res){
  res.render('awardRedirect', {user: req.user});
});

//remove an award that was selected for deletion
app.get('/removeAward', function(req, res, next) {
 if(req.user) {
  connection.query('DELETE FROM empcerts WHERE empCertID = ?', [req.query.sentid], function(err, rows){
    if(err){
      next(err);
      return;
    }
    res.redirect('/deleteAward');
  });
 }
 else
  {res.render('home');}
});

app.get('/manageUsers', function(req, res) {
 if(req.user) {
  connection.query('SELECT * FROM admins where adminID = ?', [req.user.UserID], function(err, rows){
  if(err){
	next(err);
	return;
  }
  loggedin = rows[0];
  
  var regionQuery = "SELECT * FROM regions";
  connection.query(regionQuery, function(err,rows){
      if(err){
        next(err);
        return;
      }
      res.render('manageUsers', {user: req.user, admininfo: loggedin, regions: rows});
    });
  });
 }
 else
  {res.render('home');}
});

app.get('/manageAdmins', function(req, res) {
 if(req.user) {
  connection.query('SELECT * FROM admins where adminID = ?', [req.user.UserID], function(err, rows){
  if(err){
	next(err);
	return;
  }
  loggedin = rows[0];
  
  res.render('manageAdmins', {user: req.user, admininfo: loggedin});
  });
 }
 else
  {res.render('home');}
});

app.get('/BIoperations', function(req, res) {

if(req.user){
  connection.query('SELECT * FROM admins where adminID = ?', [req.user.UserID], function(err, rows){
  if(err){
	next(err);
	return;
  }
  loggedin = rows[0];
  
  queries = [{textQ: "Which users have created awards?", query: "issuer_awards"}, 
			{textQ: "Which region had the most awards by issuer?", query: "region_awards_issuer"},
			{textQ: "Which region had the most awards by recipient?", query: "region_awards_receiver"},
			{textQ: "Which award type has been awarded the most times?", query: "award_instances"},
			{textQ: "Which user has received the most awards?", query: "recv_awards"}];	
  res.render('BIoperations', {user: req.user, admininfo: loggedin, sampleQ: queries});
  });
}
else
{res.render('home');}
});

app.post('/BIquery', function(req, res) {	
  // source: https://vmokshagroup.com/blog/building-restful-apis-using-node-js-express-js-and-ms-sql-server/
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, contentType,Content-Type, Accept, Authorization");
  res.type('application/json');

  var queryCode = req.body.query;
  if (queryCode === "issuer_awards"){
	var queryTitle = "Which users have created awards?";
	var BIQuery = "select concat(fname, ' ', lname) as name, count(*) as awardNum from empcerts" 
		+ " left join users on users.userID = empcerts.issuerID group by issuerID order by awardNum desc";
    connection.query(BIQuery, function(err,rows){
      if(err){
        next(err);
        return;
      }
	  
	  var results = {chartTitle: queryTitle, xAxis: "Number of Awards", yAxis: "Issuer Name", data: JSON.stringify(rows)};
	  res.send(results);
    });  
  }
  else if (queryCode === "region_awards_issuer"){
	var queryTitle = "Which region had the most awards by issuer?";
	var BIQuery = "select regionName as name, count(*) as awardNum from regions"
			+ " left join users on users.regionID = regions.regionID left join empcerts on empcerts.issuerID = users.userID"
			+ " group by regionName order by awardNum desc";
    connection.query(BIQuery, function(err,rows){
      if(err){
        next(err);
        return;
      }
	  
	  var results = {chartTitle: queryTitle, xAxis: "Number of Awards", yAxis: "Region Name", data: JSON.stringify(rows)};
	  res.send(results);
    });  
  }
  else if (queryCode === "region_awards_receiver"){
	var queryTitle = "Which region had the most awards by recipient?";
	var BIQuery = "select regionName as name, count(*) as awardNum from regions"
			+ " left join users on users.regionID = regions.regionID left join empcerts on empcerts.userID = users.userID"
			+ " group by regionName order by awardNum desc";
    connection.query(BIQuery, function(err,rows){
      if(err){
        next(err);
        return;
      }
	  
	  var results = {chartTitle: queryTitle, xAxis: "Number of Awards", yAxis: "Region Name", data: JSON.stringify(rows)};
	  res.send(results);
    });  
  }
  else if (queryCode === "recv_awards"){
	var queryTitle = "Which user has received the most awards?";
	var BIQuery = "select concat(fname, ' ', lname) as name, count(*) as awardNum from empcerts" 
		+ " left join users on users.userID = empcerts.userID group by users.userID order by awardNum desc";
    connection.query(BIQuery, function(err,rows){
      if(err){
        next(err);
        return;
      }
	  
	  var results = {chartTitle: queryTitle, xAxis: "Number of Awards", yAxis: "User Name", data: JSON.stringify(rows)};
	  res.send(results);
    });  
  }
  else if (queryCode === "award_instances"){
	var queryTitle = "Which award type has been awarded the most times?";
	var BIQuery = "select `name`, count(*) as awardNum from certtypes left join empcerts on certtypes.certID = empcerts.certID"
				+ " group by `name` order by awardNum desc"; 
    connection.query(BIQuery, function(err,rows){
      if(err){
        next(err);
        return;
      }
	  
	  var results = {chartTitle: queryTitle, xAxis: "Award Count", yAxis: "Award Name", data: JSON.stringify(rows)};
	  res.send(results);
    });  
  }
  else {
	  //
  }
});

app.post('/editProfile', function(req, res, next) {
  connection.query("UPDATE users SET fname=?, lname=?, signature=? WHERE userID =?", [req.body.newFName, req.body.newLName, req.body.newSig, req.user.UserID], function(err, result){

    if(err){
      next(err);
      return;
    }
  });

  res.redirect('/');
});

//Handler for creating a new admin user ===============================================

app.post('/editAdmins', function(req, res, next) {
  var loginQuery = "INSERT IGNORE INTO login (`email`, `password`, `isAdmin`) VALUES (?, ?, ?)";
  connection.query(loginQuery, [req.body.email, req.body.pword, 1], function(err,rows){
    if(err){
      next(err);
      return;
    }
    var newID = rows.insertId
    var adminQuery = "INSERT IGNORE INTO admins (`adminID`, `fname`, `lname`) VALUES (?, ?, ?)";
    connection.query(adminQuery, [newID, req.body.fName, req.body.lName], function(err,rows){
      if(err){
        next(err);
        return;
      }
    });
  });

  res.redirect('/');
});

//Handler for creating a new regular user ==================================================

app.post('/editUsers', function(req, res, next) {
  
  var loginQuery = "INSERT IGNORE INTO login (`email`, `password`, `isAdmin`) VALUES (?, ?, ?)";
  connection.query(loginQuery, [req.body.email, req.body.pword, 0], function(err,rows){
    if(err){
      next(err);
      return;
    }
    var newID = rows.insertId
    var userQuery = "INSERT IGNORE INTO users (`userID`, `regionID`, `fname`, `lname`, `signature`) VALUES (?, ?, ?, ?, ?)";
    connection.query(userQuery, [newID, req.body.rid, req.body.fName, req.body.lName, req.body.signature], function(err,rows){
      if(err){
        next(err);
        return;
      }
    });
  });
  res.redirect('/');
});

//Handler for editing an admin user =======================================================

app.post('/edit-admin-row', function(req, res, next) {
  
  var loginQuery = "UPDATE login SET email=? WHERE UserID=?";
  connection.query(loginQuery, [req.body.email, req.body.UserID], function(err,rows){
    if(err){
      next(err);
      return;
    }

    var adminsQuery = "UPDATE admins SET fname=?, lname=? WHERE adminID=?";
    connection.query(adminsQuery, [req.body.fName, req.body.lName, req.body.UserID], function(err,rows){
      if(err){
        next(err);
        return;
      }
    });
  });

  res.redirect('/');
});

//Handler for editing a regular user ======================================================

app.post('/edit-user-row', function(req, res, next) {
  
  var loginQuery = "UPDATE login SET email=? WHERE UserID=?";
  connection.query(loginQuery, [req.body.email, req.body.UserID], function(err,rows){
    if(err){
      next(err);
      return;
    }

    var usersQuery = "UPDATE users SET fname=?, lname=?, regionID=? WHERE userID=?";
    connection.query(usersQuery, [req.body.fName, req.body.lName, req.body.regionID, req.body.UserID], function(err,rows){
      if(err){
        next(err);
        return;
      }
    });
  });

  res.redirect('/');
});

//handler for viewing/deleting regular users=================================

app.get("/regUsers", function(req, res, next){
	
	connection.query("SELECT * FROM users INNER JOIN login on users.userID = login.UserID WHERE login.isAdmin = 0", function(err, rows, fields){
		if(err){
			next(err);
			return;
		}
		
		
	res.send(JSON.stringify(rows));
	});
	
	
});


app.get("/delete-row", function(req, res, next){
	
	
	connection.query("DELETE FROM users WHERE userID=?", [req.query.UserID], function(err, rows, fields){
		if(err){
			next(err);
			return;
		}
	});
	
	connection.query("DELETE FROM login WHERE UserID=?", [req.query.UserID], function(err, rows, fields){
		if(err){
			next(err);
			return;
		}
	});
	
	
	connection.query("SELECT * FROM users INNER JOIN login on users.userID = login.UserID WHERE login.isAdmin = 0", function(err, rows, fields){
		if(err){
			next(err);
			return;
		}
		
		
	res.send(JSON.stringify(rows));
	});
	
});
//handler for viewing/deleting admin users=======================================

app.get("/adminUsers", function(req, res, next){
	
	connection.query("SELECT * FROM admins INNER JOIN login on admins.adminID = login.UserID WHERE login.isAdmin = 1", function(err, rows, fields){
		if(err){
			next(err);
			return;
		}
		
		
	res.send(JSON.stringify(rows));
	});
	
	
});

app.get("/delete-admin-row", function(req, res, next){
	
	connection.query("DELETE FROM admins WHERE adminID = ?", [req.query.UserID], function(err, rows, fields){
		if(err){
			next(err);
			return;
		}
	});
	
	connection.query("DELETE FROM login WHERE UserID=?", [req.query.UserID], function(err, rows, fields){
		if(err){
			next(err);
			return;
		}
	});	
	
	connection.query("SELECT * FROM admins INNER JOIN login on admins.adminID = login.UserID WHERE login.isAdmin = 1", function(err, rows, fields){
		if(err){
			next(err);
			return;
		}
		
		
	res.send(JSON.stringify(rows));
	});
	
});

//====================================================================

app.use(function(req,res){
  res.status(404);
  res.render('404');
});

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500);
  res.render('500');
});

//===============PORT=================
app.listen(app.get('port'), function(){
  console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});
