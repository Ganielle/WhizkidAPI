const { default: mongoose } = require("mongoose")
const Storyassessment = require("../models/Storyassessment")
const Userdetails = require("../models/Userdetails")
// const OpenAI = require('openai');
// const openai = new OpenAI({ apiKey: process.env.CHATGPTKEY });

//  #region USER

exports.getstudentdashboard = async (req, res) => {
    const {id, username} = req.user
    const assessment = await Storyassessment.find({owner: new mongoose.Types.ObjectId(id)})
    .sort({'createdAt': 1})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem getting the assessment data of ${username}. Error ${err}`)

        return res.status(400).json({message: "bad-request", data: "There's a problem getting the assessment data. Please contact customer support for more details."})
    })

    if (assessment.length <= 0){
        return res.json({message: "success", data: {
            title: "",
            statistics: {
                score: 0,
                accuracy: 0,
                speed: 0,
                prosody: 0,
                pitch: 0,
                intensity: 0,
                tempo: 0
            }
        }})
    }

    const data = {
        title: "",
        statistics: {
            score: 0,
            accuracy: 0,
            speed: 0,
            prosody: 0,
            pitch: 0,
            intensity: 0,
            tempo: 0
        }
    }

    assessment.forEach(tempdata => {
        const {title, accuracy, speed, prosody, pitch, intensity, tempo} = tempdata

        data.title = title
        data.statistics.score = ((accuracy + speed + prosody) / 500) * 100,
        data.statistics.accuracy = accuracy
        data.statistics.speed = speed
        data.statistics.prosody = (prosody / 300) * 100
        data.statistics.pitch = pitch ? pitch : 0
        data.statistics.intensity = intensity ? intensity : 0
        data.statistics.tempo = tempo ? tempo : 0
    })

    return res.json({message: "success", data: data})
}

//  #endregion

//  #region ADMIN

exports.getadminuserdashboard = async (req, res) => {
    const {id, username} = req.user
    const {userid} = req.query

    console.log("whaaat");
    const assessment = await Storyassessment.find({owner: new mongoose.Types.ObjectId(userid)})
    .sort({'createdAt': 1})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem getting the assessment data of ${username}. Error ${err}`)

        return res.status(400).json({message: "bad-request", data: "There's a problem getting the assessment data. Please contact customer support for more details."})
    })
    

    const details = await Userdetails.findOne({owner: new mongoose.Types.ObjectId(userid)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem getting the user details data of ${userid}. Error ${err}`)

        return res.status(400).json({message: "bad-request", data: "There's a problem getting the assessment data. Please contact customer support for more details."})
    })

    if (assessment.length <= 0){
        return res.json({message: "success", data: {
            title: "",
            fullname: `${details.firstname} ${details.lastname}`,
            statistics: {
                score: 0,
                accuracy: 0,
                speed: 0,
                prosody: 0,
                pitch: 0,
                intensity: 0,
                tempo: 0
            }
        }})
    }

    const data = {
        title: "",
        fullname: `${details.firstname} ${details.lastname}`,
        statistics: {
            score: 0,
            accuracy: 0,
            speed: 0,
            prosody: 0,
            pitch: 0,
            intensity: 0,
            tempo: 0
        }
    }

    assessment.forEach(tempdata => {
        const {title, accuracy, speed, prosody, pitch, intensity, tempo} = tempdata

        data.title = title
        data.statistics.score = ((accuracy + speed + prosody) / 500) * 100,
        data.statistics.accuracy = accuracy
        data.statistics.speed = speed
        data.statistics.prosody = (prosody / 300) * 100
        data.statistics.pitch = pitch ? pitch : 0
        data.statistics.intensity = intensity ? intensity : 0
        data.statistics.tempo = tempo ? tempo : 0
    })

    return res.json({message: "success", data: data})
}

//  #endregion