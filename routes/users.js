const router = require("express").Router()
const {createstudents, getstudentlist} = require("../controllers/users")
const {protectplayer, protectadmin} = require("../middleware/middleware")

router
    .get("/getstudentlist", protectadmin, getstudentlist)
    .post("/createstudents", protectadmin, createstudents)

module.exports = router;