const routers = app => {
    console.log("Routers are all available");

    app.use("/auth", require("./auth"))
    app.use("/users", require("./users"))
    app.use("/dashboard", require("./dashboard"))
    app.use("/story", require("./storyassessment"))
    app.use("/uploads", require('./upload'))
}

module.exports = routers