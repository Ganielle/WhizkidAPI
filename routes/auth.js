const router = require("express").Router()
const {login} = require("../controllers/auth")

router
    .get("/login", login)


module.exports = router;