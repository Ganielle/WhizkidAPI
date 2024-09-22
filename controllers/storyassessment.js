const Storyassessment = require("../models/Storyassessment")
const {GoogleAuth} = require('google-auth-library');

const {computeAccuracy, analyzeProsody, getWavDuration} = require("../utils/assessmentutils")
const {convertdatetime} = require("../utils/datetimeutils")
const {Configuration, OpenAIApi} = require("openai")

const { SpeechClient } = require('@google-cloud/speech');
const fs = require('fs');
const { default: mongoose } = require("mongoose");
const path = require('path');

const client = new SpeechClient();

// const configuration = Configuration({ apiKey: process.env.CHATGPTKEY });
// const openai = OpenAIApi(configuration);

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
      enableAutomaticPunctuation: true,
      useEnhanced: true,
      enableWordTimeOffsets: true,
    };
    const request = { audio: audio, config: config };

    const [response] = await client.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    const finaltranscript = transcription.replace(/[\r\n]+/g, '');

    console.log(finaltranscript);

    const words = response.results.flatMap(result => result.alternatives[0].words);
    
    // Calculate total duration of the user's recording
    const startTime = Date.now();
    const endTime = Date.now();
    const actualDuration = getWavDuration(path.resolve(__dirname, '..', recording));

    // Calculate the number of words transcribed
    const wordCount = words.length;

    // Calculate reading speed in words per minute
    const readingSpeedWPM = (wordCount / actualDuration) * 60;

    // Calculate percentage based on the duration range
    const fastestDuration = 180; // seconds
    const slowestDuration = 360; // seconds

    // Calculate total word count for the reference story
    const totalWordCount = referencestory.split(/\s+/).filter(word => word.length > 0).length;

    // Calculate expected duration to read the full story at the fastest pace
    const expectedDurationAtFastestPace = (totalWordCount / (60 / fastestDuration)) * fastestDuration;

    let readingSpeedPercentage;

    if (actualDuration <= fastestDuration) {
      readingSpeedPercentage = 100;
    } else if (actualDuration >= slowestDuration) {
      readingSpeedPercentage = 0;
    } else {
      // Adjust percentage based on actual reading duration
      readingSpeedPercentage = ((1 - (actualDuration - fastestDuration) / (slowestDuration - fastestDuration)) * 100);
    }

    // Calculate the percentage based on completion ratio if the user stops midway
    const completionRatio = Math.min(wordCount / totalWordCount, 1); // Ensure it’s between 0 and 1
    const adjustedPercentage = readingSpeedPercentage * completionRatio;

    

    const accuracy = computeAccuracy(transcription, referencestory);
    const prosodyStats = analyzeProsody(path.resolve(__dirname, '..', recording), referencestory);

    await Storyassessment.create({owner: new mongoose.Types.ObjectId(id), title: storytitle, accuracy: accuracy, speed: adjustedPercentage, prosody: (prosodyStats.averagePitchPercentage + prosodyStats.intensityPercentage + prosodyStats.tempoPercentage), pitch: prosodyStats.averagePitchPercentage, intensity: prosodyStats.intensityPercentage, tempo: prosodyStats.tempoPercentage, userstory: finaltranscript, recordfile: recording})
    .catch(err => {
      console.log(`There's a problem saving story assessment for ${username}. Error: ${err}`)

      return res.status(400).json({message: "bad-request", data: "There's a problem saving story assessment. Please contact customer support!"})
    })

    return res.json({message: "success", data: {
      score: ((accuracy + readingSpeedPercentage + (prosodyStats.averagePitchPercentage + prosodyStats.intensityPercentage + prosodyStats.tempoPercentage)) / 500) * 100,
      accuracy: accuracy,
      speed: adjustedPercentage,
      prosody: ((prosodyStats.averagePitchPercentage + prosodyStats.intensityPercentage + prosodyStats.tempoPercentage) / 300) * 100,
      pitch: prosodyStats.averagePitchPercentage,
      intensity: prosodyStats.intensityPercentage,
      tempo: prosodyStats.tempoPercentage
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
      score: 0,
      pitch: 0,
      intensity: 0,
      tempo: 0,
      transcript: ""
    }})
  }

  console.log(historydata)

  const data = {
    title: historydata.title,
    accuracy: historydata.accuracy,
    speed: historydata.speed,
    prosody: (historydata.prosody / 300) * 100,
    score: ((historydata.accuracy + historydata.speed + historydata.prosody) / 500) * 100,
    recordfile: historydata.recordfile,
    pitch: historydata.pitch,
    intensity: historydata.intensity,
    tempo: historydata.tempo,
    transcript: historydata.userstory
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

exports.deleteassessment = async (req, res) => {
  const {assessmentid} = req.body

  if (!assessmentid){
    res.status(400).json({message: "failed", data: "Please select a valid assessment data first and try again!"})
  }

  await Storyassessment.deleteOne({_id: new mongoose.Types.ObjectId(assessmentid)})
  .catch(err => res.status(400).json({message: "bad-request", data: "There's a problem deleting the assessment data! Please contact customer support for more details"}))

  return res.json({message: "success"})
}

//  #endregion