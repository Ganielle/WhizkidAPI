const Storyassessment = require("../models/Storyassessment")

const {computeAccuracy} = require("../utils/assessmentutils")
const {convertdatetime} = require("../utils/datetimeutils")

const { SpeechClient } = require('@google-cloud/speech');
const fs = require('fs');
const { default: mongoose } = require("mongoose");
const path = require('path');

const client = new SpeechClient();

//  #region USER

exports.assessment = async (req, res) => {
  const {id, username} = req.user

  const {storytitle, referencestory} = req.body

  let recording = ""

  if (req.file){
      recording = req.file.path
  }
  else{
      return res.status(400).json({ message: "failed", 
      data: "Please complete the form before saving the data!" })
  }

  try {
    const audioBytes = await fs.readFileSync(path.resolve(__dirname, '..', recording)).toString('base64');

    const audio = { content: audioBytes };
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 44100,
      languageCode: 'en-US',
    };
    const request = { audio: audio, config: config };

    const startTime = Date.now();
    const [response] = await client.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // in seconds

    const accuracy = computeAccuracy(transcription, referencestory);

    await Storyassessment.create({owner: new mongoose.Types.ObjectId(id), title: storytitle, accuracy: accuracy, speed: 0, prosody: 0, recordfile: recording})
    .catch(err => {
      console.log(`There's a problem saving story assessment for ${username}. Error: ${err}`)

      return res.status(400).json({message: "bad-request", data: "There's a problem saving story assessment. Please contact customer support!"})
    })

    return res.json({message: "success", data: {
      score: ((accuracy + 0 + 0) / 500) * 100,
      accuracy: accuracy,
      speed: 0,
      prosody: 0
    }})
  } catch (error) {
    console.log(`There's a problem saving story assessment for ${username}. Error: ${error}`)

    return res.status(400).json({message: "bad-request", data: "There's a problem saving story assessment. Please contact customer support!"})
  }
}

exports.viewlistassessments = async (req, res) => {
  const {id, username} = req.user
  const {page, limit} = req.query

  const pageOptions = {   
      page: parseInt(page) || 0,
      limit: parseInt(limit) || 10
  };

  const storyassessmentlist = await Storyassessment.find({owner: new mongoose.Types.ObjectId(id)})
  .skip(pageOptions.page * pageOptions.limit)
  .limit(pageOptions.limit)
  .sort({'createdAt': -1})
  .then(data => data)
  .catch(err => {
    console.log(`There's a problem getting the story assessment list for ${username}. Error: ${err}`)

    return res.status(400).json({message: "bad-request", data: "here's a problem getting the story assessment list. Please contact customer support."})
  })

  if (storyassessmentlist.length <= 0){
    return res.json({message: "success", data: {
      history: [],
      totalpages: 0
    }})
  }

  
  const totalpages = await Storyassessment.countDocuments({owner: new mongoose.Types.ObjectId(id)})
  .then(data => data)
  .catch(err => {
      console.log(`There's a problem getting story assessment history count. Error ${err}`);
      return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details." });
  });

  
  const pages = Math.ceil(totalpages / pageOptions.limit)

  const data = {
    history: [],
    totalpages: pages
  }

  storyassessmentlist.forEach(tempdata => {
    const {_id, title, accuracy, speed, prosody, createdAt} = tempdata

    data.history.push({
      storyid: _id,
      title: title,
      score: ((accuracy + speed + prosody) / 500) * 100,
      createdAt: convertdatetime(createdAt)
    })
  })

  return res.json({message: "success", data: data})
}

exports.viewstoryassessmentdata = async (req, res) => {
  const {id, username} = req.user
  const {historyid} = req.query

  const historydata = await Storyassessment.findOne({_id: new mongoose.Types.ObjectId(historyid)})
  .then(data => data)
  .catch(err => {
    console.log(`There's a problem getting the story assessment data for ${username}. Error: ${err}`)

    return res.status(400).json({message: "bad-request", data: "There's a problem getting the story assessment data. Please contact customer support."})
  })

  if (!historydata){
    return res.json({message: "success", data: {
      title: "",
      accuracy: 0,
      speed: 0,
      prosody: 0,
      score: 0
    }})
  }

  console.log(historydata)

  const data = {
    title: historydata.title,
    accuracy: historydata.accuracy,
    speed: historydata.speed,
    prosody: historydata.prosody,
    score: ((historydata.accuracy + historydata.speed + historydata.prosody) / 500) * 100,
    recordfile: historydata.recordfile
  }

  return res.json({message: "success", data: data})
}

//  #endregion

//  #region ADMIN

exports.viewassessmenthistory = async (req, res) => {
  const { id, username } = req.user;
  const { page, limit } = req.query;

  const pageOptions = {
    page: parseInt(page) || 0,
    limit: parseInt(limit) || 10
  };

  try {
    // Aggregate the story assessments with user details
    const storyassessmentlist = await Storyassessment.aggregate([
      {
        $lookup: {
          from: 'userdetails', // Collection name for user details
          localField: 'owner',
          foreignField: 'owner', // Assuming owner field in userdetails matches the user ID
          as: 'userDetails'
        }
      },
      { $unwind: '$userDetails' }, // Deconstruct the userDetails array
      { $sort: { createdAt: -1 } },
      { $skip: pageOptions.page * pageOptions.limit },
      { $limit: pageOptions.limit }
    ]);

    if (storyassessmentlist.length <= 0) {
      return res.json({ message: "success", data: { history: [], totalpages: 0 } });
    }

    const totalDocuments = await Storyassessment.countDocuments();
    const totalpages = Math.ceil(totalDocuments / pageOptions.limit);

    const data = {
      history: [],
      totalpages: totalpages
    };

    storyassessmentlist.forEach(tempdata => {
      const { _id, title, accuracy, speed, prosody, createdAt, userDetails } = tempdata;
      const { firstname, lastname } = userDetails;

      data.history.push({
        storyid: _id,
        title: title,
        score: ((accuracy + speed + prosody) / 500) * 100,
        fullname: `${firstname} ${lastname}`,
        createdAt: convertdatetime(createdAt)
      });
    });

    return res.json({ message: "success", data: data });
  } catch (err) {
    console.log(`There's a problem getting the story assessment list for ${username}. Error: ${err}`);
    return res.status(400).json({ message: "bad-request", data: "There's a problem getting the story assessment list. Please contact customer support." });
  }
};


//  #endregion