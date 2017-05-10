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

          var insertQuery = "INSERT INTO login ( email, password) values (?, ?)";
		  //var insertUsersQuery = "INSERT INTO users ( userID, fname, lname ) values (?, ?, ?)";
          console.log(insertQuery);

          // ALSO INSERT TIME CREATED
          connection.query(insertQuery, [email, password], function(err,rows){
            newUserMysql.id = rows.insertId;
			//connection.query(insertUsersQuery, [rows.insertID, req.body.fname, req.body.lname], function(err,rows){return done(null, newUserMysql);});

            return done(null, newUserMysql);
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
app.set('port', 50000);


//===============ROUTES===============

app.get('/', function(req, res) {
  if(req.user)
	{		
    var context = {};
    connection.query('SELECT email FROM login where UserID = ?', [req.user.UserID], function(err, rows){
      if(err){
        next(err);
        return;
      }
      console.log(rows);
      res.render('home', {user: req.user, rows: rows});
    });
	}
	
	else
	{res.render('home', {user: req.user});}

  
});

//displays our signup page
app.get('/signin', function(req, res){
  res.render('signin', { msg: req.flash('signupMessage'), msg: req.flash('loginMessage')});
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

//displays reset password page
app.post('/newPass', function(req, res){
  // do something with req.body.acctEmail
  res.redirect('/');
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
  var uname = req.user.email;
  console.log("LOGGIN OUT " + uname);
  req.logout();
  res.redirect('/');
  req.session.notice = "You have successfully been logged out " + uname + "!";
});


//EXAMPLE ROUTE: REPLACE THIS
app.get('/examplePage', function(req, res) {
  res.render('examplePage', {user: req.user});
});

app.get('/createNewAward', function(req, res) {
  // search for all employees
  var empQuery = "SELECT * FROM users";
  connection.query(empQuery, function(err,rows){
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
      res.render('createNewAward', {user: req.user, users: users, type: rows});
    });
  });
});

app.get('/changeName', function(req, res, next) {
  var ID = req.user.UserID;
  connection.query('SELECT fname, lname FROM users WHERE userID = ?', [ID], function(err, rows){
    if(err){
      next(err);
      return;
    }
    name = rows[0];
    res.render('changeName', {user: req.user, name: name});
  });
});

app.get('/deleteAward', function(req, res) {
  res.render('deleteAward', {user: req.user});
});

app.get('/manageUsers', function(req, res) {
  res.render('manageUsers', {user: req.user});
});

app.get('/manageAdmins', function(req, res) {
  res.render('manageAdmins', {user: req.user});
});

app.get('/BIoperations', function(req, res) {
  res.render('BIoperations', {user: req.user});
});

app.post('/editProfile', function(req, res, next) {
  connection.query("UPDATE users SET fname=?, lname=? WHERE userID =?", [req.body.newFName, req.body.newLName, req.user.UserID], function(err, result){

    if(err){
      next(err);
      return;
    }
    connection.query("UPDATE login SET isAdmin=? WHERE userID =?", [req.user.isAdmin, req.user.UserID], function(err, result){
      if(err){
      next(err);
      return;
    }
    });
  });

  res.redirect('/');
});

app.post('/editAdmins', function(req, res, next) {
  connection.query("INSERT admins SET fname=?, lname=?", [req.body.fName, req.body.lName], function(err, result){

    if(err){
      next(err);
      return;
    }
  });
  
  connection.query("INSERT login SET email=?, password=?", [req.body.email, req.body.pword], function(err, result){

    if(err){
      next(err);
      return;
    }
  });

  res.redirect('/');
});

app.post('/editUsers', function(req, res, next) {
  
  connection.query("INSERT login SET email=?, password=?", [req.body.email, req.body.pword], function(err, result){
	
    if(err){
      next(err);
      return;
    }
  });
  
  connection.query("INSERT users SET fname=?, lname=?", [req.body.fname, req.body.lname], function(err, result){

    if(err){
      next(err);
      return;
    }
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
