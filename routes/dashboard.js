const router = require("express").Router()
const {getstudentdashboard,getadminuserdashboard} = require("../controllers/dashboard")
const {protectplayer, protectadmin} = require("../middleware/middleware")

router
    .get("/getstudentdashboard", protectplayer, getstudentdashboard)
    .get("/getadminuserdashboard", protectadmin, getadminuserdashboard)

module.exports = router;