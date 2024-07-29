const mongoose = require("mongoose");

const storyAssessmentSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users"
        },
        title: {
            type: String
        },
        accuracy: {
            type: Number
        },
        speed: {
            type: Number
        },
        prosody: {
            type: Number
        },
        recordfile: {
            type: String
        }
    },
    {
        timestamps: true
    }
)
const Storyassessment = mongoose.model("Storyassessment", storyAssessmentSchema)
module.exports = Storyassessment