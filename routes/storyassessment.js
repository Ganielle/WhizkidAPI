const router = require("express").Router()
const { assessment, viewlistassessments, viewstoryassessmentdata, viewassessmenthistory, deleteassessment } = require("../controllers/storyassessment")
const {protectplayer, protectadmin} = require("../middleware/middleware")
const recordingupload = require("../middleware/uploadrecordings")

const uploadassessment = recordingupload.single("story")

router
    .get("/viewlistassessments", protectplayer, viewlistassessments)
    .get("/viewstoryassessmentdata", protectplayer, viewstoryassessmentdata)
    .get("/viewassessmenthistory", protectadmin, viewassessmenthistory)
    .get("/viewstoryassessmentdataadmin", protectadmin, viewstoryassessmentdata)
    .post("/assessment", function (req, res, next){
        uploadassessment(req, res, function(err) {
            if (err){
                return res.status(400).send({ message: "failed", data: err.message })
            }

            next()
        })
    }, protectplayer, assessment)
    .post("/deleteassessment", protectadmin, deleteassessment)

module.exports = router;