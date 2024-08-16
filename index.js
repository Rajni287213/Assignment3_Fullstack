const express = require("express");
const path = require("path");
const app = express();
const ejs = require("ejs");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");
const mongoose = require("mongoose");
const User = require("./models/user");


mongoose.connect(
  "mongodb+srv://rajnisandhu487:hKfb01TFbTAMnJwm@cluster0.tqmrt1s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

app.use(
  session({
    secret: "your_secret_key_here",
    resave: false,
    saveUninitialized: false,
  })
);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));


// Middleware for user authentication
const authenticateUser = async (req, res, next, userType) => {
  try {
    if (
      req.session &&
      req.session.user &&
      req.session.user.userType === userType
    ) {
      const user = await User.findById(req.session.user._id);
      if (user) {
        req.user = user;
        return next();
      }
    }
    res.redirect("/login");
  } catch (error) {
    console.error("Error authenticating user:", error);
    res.status(500).send("Internal Server Error");
  }
};

const authenticateDriver = (req, res, next) =>
  authenticateUser(req, res, next, "Driver");


app.get("/", (req, res) => {
  res.render("index", { user: req.session.user });
});

app.get("/login", (req, res) => {
  res.render("login", { user: req.session.user });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ username: email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).send("Invalid email or password");
    }
    req.session.user = { _id: user._id, userType: user.userType };
    res.redirect("/");
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/signup", (req, res) => {
  res.render("signup", { user: req.session.user });
});

app.post("/signup", async (req, res) => {
  const { username, password, repeatPassword, userType } = req.body;
  if (password !== repeatPassword) {
    return res.status(400).send("Passwords do not match");
  }
  try {
    let licenseNumber = "default";
    let count = 1;
    let userExists = true;

    // Loop until a unique licenseNumber is found
    while (userExists) {
      const existingUser = await User.findOne({ licenseNumber });
      if (!existingUser) {
        userExists = false;
      } else {
        licenseNumber = `default${count}`; // Modify as per your requirement
        count++;
      }
    }

    const newUser = new User({
      username,
      password,
      userType,
      firstName: "default",
      lastName: "default",
      licenseNumber,
      age: 0,
      carDetails: {
        make: "default",
        model: "default",
        year: 0,
        plateNumber: "default",
      },
    });
    await newUser.save();
    res.redirect("/login");
  } catch (error) {
    if (
      error.code === 11000 &&
      error.keyPattern &&
      error.keyPattern.licenseNumber === 1
    ) {
      return res.status(400).send("License Number already exists");
    }
    console.error("Error creating user:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed to logout");
    }
    res.redirect("/login");
  });
});

app.get("/G", authenticateDriver, (req, res) => {
  res.render("G", { user: req.user });
});

app.get("/G2", authenticateDriver, (req, res) => {
  res.render("G2", { user: req.user });
});


app.post("/submit", authenticateDriver, async (req, res) => {
  const {
    firstName,
    lastName,
    licenseNumber,
    age,
    make,
    model,
    year,
    plateNumber,
  } = req.body;
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        firstName,
        lastName,
        licenseNumber,
        age,
        "carDetails.make": make,
        "carDetails.model": model,
        "carDetails.year": year,
        "carDetails.plateNumber": plateNumber,
      },
      { new: true }
    );
    res.redirect("/G2");
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/updateUser", authenticateDriver, async (req, res) => {
  const { make, model, year, plateNumber } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        "carDetails.make": make,
        "carDetails.model": model,
        "carDetails.year": year,
        "carDetails.plateNumber": plateNumber,
      },
      { new: true }
    );
    res.render("G", { user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send("Internal Server Error");
  }
});


app.listen(1997, () => {
  console.log("App listening on port 1997");
});
