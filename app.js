require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
let secret ="";
const app  = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
    extended:true
}));
app.use(session({
    secret:"My secrets",
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");

mongoose.connect("mongodb://localhost/userDB", {useNewUrlParser:true, useUnifiedTopology:true}, function(err){
    if(!err){
        console.log("Succesfully connected to database");
    } else {
        console.log(err);
    }
});

mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String, 
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render("home");
});

app.get("/secrets", function(req, res){
    if(req.isAuthenticated()){
        User.findOne({_id:req.user.id}, function(err, foundUser){
            if(!err){
                let secret = foundUser.secret;
                res.render("secrets", {secret:secret});    
            }
        });
       
    }else {
        res.redirect("/login");
    }
});

app.get("/auth/google",
    passport.authenticate('google', {scope:["profile"]})
);

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
  res.redirect("/secrets");
});

app.route("/login")
.get(function(req, res){
    res.render("login");
})
.post(function(req,res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if (err){
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
});
    
app.route("/register")
.get(function(req, res){
    res.render("register");
})
.post(function(req, res){
    User.register({username:req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req,res, function(){
                res.redirect("/secrets");
            });
        }
    });       
});

app.route("/submit")
.get(function(req,res){
    if (req.isAuthenticated()){
        res.render("submit");
    } else {
        res.redirect("/login");
    }  
})
.post(function(req,res){
    secret = req.body.secret;
    User.findById(req.user.id, function(err, foundUser){
        if(!err){
            foundUser.secret= secret;
            foundUser.save(function(err){
                if(!err){
                    res.redirect("secrets");
                }
            })
        }
    });
});

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});

app.listen(3000, function(){
    console.log("Server is running on port 3000");
});

