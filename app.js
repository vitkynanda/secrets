const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const encrypt = require("mongoose-encryption");
const { Router } = require("express");
const app  = express();


app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

app.set("view engine", "ejs");

mongoose.connect("mongodb://localhost/userDB", {useNewUrlParser:true, useUnifiedTopology:true}, function(err){
    if(!err){
        console.log("Succesfully connected to database");
    } else {
        console.log(err);
    }
});

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const secret = "ThisIsMySecret";

userSchema.plugin(encrypt, {secret:secret, encryptedFields: ['password']});




const User = mongoose.model("User", userSchema);

app.get("/", function(req, res){
    res.render("home");
});

app.route("/login")
.get(function(req, res){
    res.render("login");
})
.post(function(req,res){
    const username = req.body.username;
    const password = req.body.password;
    User.findOne({email:username}, function(err, foundUser){
        if(err){
            console.log(err);
        } else {
            if (foundUser){
                if (foundUser.password === password){
                    console.log("Login successfully");
                    res.render("secrets");
                }
                else {
                    console.log("User not registed");
                }
            }
        }
    });
});

app.route("/register")
.get(function(req, res){
    res.render("register");
})
.post(function(req, res){
    const username = req.body.username;
    const password = req.body.password;
        const user = new User ({
            email:username,
            password:password
        });
        user.save(function(err){
            if(!err){
                console.log("Register new user successfully");
                res.render("secrets");
            } else {
                console.log(err);
            }
        });     
});

app.get("/submit", function(req,res){
    res.render("submit");
});

app.get("/logout", function(req, res){
    res.redirect("/");
});

app.listen(3000, function(){
    console.log("Server is running on port 3000");
});

