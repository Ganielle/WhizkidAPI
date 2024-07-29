const mongoose = require("mongoose");

const userDetailsSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users"
        },
        firstname: {
            type: String
        },
        lastname: {
            type: String
        }
    },
    {
        timestamps: true
    }
)

const Userdetails = mongoose.model("Userdetails", userDetailsSchema)
module.exports = Userdetails