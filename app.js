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

// ---Using bcrypt---
// const bcrypt = require("bcrypt");

// ---Hash password using md5---
// const md5 = require("md5");

// ---Using mongoose ecrypt---
// const encrypt = require("mongoose-encryption");

const app  = express();

//  ---Salt bcrypt---
// const saltRounds = 10;

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
    email: String,
    password: String,
    googleId: String
});

// ---Encrypt password Using mongoosse encrypt---
// const secret = process.env.SECRET;
// userSchema.plugin(encrypt, {secret:secret, encryptedFields: ['password']});

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
      console.log(profile);
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
        res.render("secrets");
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

    // --Decrypt using bcrypt---
    // const username = req.body.username;
    // const password = req.body.password;
    // User.findOne({email:username}, function(err, foundUser){
    //     if(err){
    //         console.log(err);
    //     } else {
    //         if (foundUser){
    //             bcrypt.compare(password, foundUser.password, function(err, result){
    //                 if (result=== true){
    //                     res.render("secrets");    
    //                 } else {
    //                     console.log("User not registered");
    //                     res.redirect("/login");
    //                 }
    //             });
    //         }
    //     }
    // });
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
    })    
    // ---encrypt password using brypt---
    // const username = req.body.username;
    // const password = req.body.password;

    // bcrypt.hash(password, saltRounds, function(err, hash){
    //     const user = new User ({
    //         email:username,
    //         password:hash
    //     });
    //     user.save(function(err){
    //         if(!err){
    //             console.log("Register new user successfully");
    //             res.render("secrets");
    //         } else {
    //             console.log(err);
    //         }
    //     });     
    // });
       
});

app.get("/submit", function(req,res){
    res.render("submit");
});

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});

app.listen(3000, function(){
    console.log("Server is running on port 3000");
});

