
// Get all the packages
const express = require('express')
const dotenv = require('dotenv')
const passport = require('passport')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const RedisStore = require('connect-redis')(session)
const bodyParser = require('body-parser')
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy

// Setup configuration variables
dotenv.config()
const PORT = process.env.PORT || 8080
const GOOGLE_CLIENT_ID = process.env.OAUTH2_GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.OAUTH2_GOOGLE_CLIENT_SECRET
const GOOGLE_CB_PATH = process.env.OAUTH2_GOOGLE_CALLBACK_PATH
const SESSION_SECRET = process.env.SESSION_SECRET
const REDIS_HOST = process.env.REDIS_HOST
const REDIS_PORT = process.env.REDIS_PORT


// Setup passport.js
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new GoogleStrategy({
    clientID:     GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: `http://localhost:${PORT}${GOOGLE_CB_PATH}`,
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    return done(null, profile);
  }
));

// Setup Express
var app = express()

// Setup Express middleware
app.use(logger('dev'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(cookieParser()); 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));


// [IMPORTANT] IF: you have redis running use this block to take advantage of persistent sessions with redis
app.use( session({ 
  secret: SESSION_SECRET,
  name:   'kaas',
  store:  new RedisStore({
    host: REDIS_HOST,
    port: REDIS_PORT
  }),
  proxy:  true,
    resave: true,
    saveUninitialized: true
}));

// ELSE: Use virtual memory
// app.use(session({
// 	secret: SESSION_SECRET,
// 	resave: true,
// 	saveUninitialized: true
// }))
// ENDIF


// Connect passport middleware with express
app.use(passport.initialize());
app.use(passport.session());



// Setup basi endpoints
app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});


//  Used to authenticate with Google, clients are redirected to google.com for 
//  authentication. After authentication either succeeds or fails, the client
//  will be redirected to /auth/google/callback in this app
app.get('/auth/google', passport.authenticate('google', { scope: [
       'https://www.googleapis.com/auth/plus.login',
       'https://www.googleapis.com/auth/plus.profile.emails.read'] 
}));


//   After Google authenticates the user, it sends an HTTP request to this endpoint
//   with a message in which passport decides wether Google failed to authenticate
//   the user or not and redirects the client to the specified success or failure 
//   endpoints.
app.get( '/auth/google/callback', 
    	passport.authenticate( 'google', { 
    		successRedirect: '/',
    		failureRedirect: '/login'
}));

// Destroys session and redirects user to the homepage
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

// Starts the server
app.listen(PORT, function () {
  console.log(`[Listening]`,`URL: `, `http://localhost:${PORT}`)
})

// Authentication middleware which is used to prevent users from accessing
// specific areas of the site unless they are authenticated.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}


















