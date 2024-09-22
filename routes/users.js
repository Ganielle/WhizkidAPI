const router = require("express").Router()
const {createstudents, getstudentlist, deleteuser} = require("../controllers/users")
const {protectplayer, protectadmin} = require("../middleware/middleware")

router
    .get("/getstudentlist", protectadmin, getstudentlist)
    .post("/createstudents", protectadmin, createstudents)
    .post("/deleteuser", protectadmin, deleteuser)

module.exports = router;