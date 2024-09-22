const Users = require("../models/Users")
const Userdetails = require("../models/Userdetails")
const Storyassessment = require("../models/Storyassessment")
const { default: mongoose } = require("mongoose")

exports.createstudents = async (req, res) => {
    const {id, username} = req.user

    const {studentusername, password, firstname, lastname} = req.body

    if (!studentusername || !password || !firstname || !lastname){
        return res.status(400).json({message: "failed", data: "Please complete the form first and try again"})
    }

    const userlogin = await Users.findOne({ username: { $regex: new RegExp('^' + studentusername + '$', 'i') } })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem getting existing users. Error: ${err}`)

        return res.status(400).json({message: "bad-request", data: "There's a problem creating user loggin! Please try again later."})
    })

    if (userlogin){
        return res.status(400).json({message: "failed", data: "There's an existing username! Please use other username."})
    }

    const userdeets = await Userdetails.findOne({ firstname: { $regex: new RegExp('^' + firstname + '$', 'i') }, lastname: { $regex: new RegExp('^' + lastname + '$', 'i') } })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem getting existing users details. Error: ${err}`)

        return res.status(400).json({message: "bad-request", data: "There's a problem creating user loggin! Please try again later."})
    })

    if (userdeets){
        return res.status(400).json({message: "failed", data: "There's an existing student!."})
    }

    const userlogindeets = await Users.create({username: studentusername, password: password})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem creating user loggin. Error ${err}`)

        return res.status(400).json({message: "bad-request", data: "There's a problem creating user loggin! Please try again later."})
    })

    await Userdetails.create({owner: new mongoose.Types.ObjectId(userlogindeets._id), firstname: firstname, lastname: lastname})
    .catch(async err => {
        console.log(`There's a problem creating user details. Error ${err}`)

        await Users.findOneAndDelete({username: studentusername})

        return res.status(400).json({message: "bad-request", data: "There's a problem creating user loggin! Please try again later."})
    })

    return res.json({message: "success"})
}

exports.getstudentlist = async (req, res) => {
    const { id, username } = req.user;
    const { fullname, page, limit } = req.query;

    const pageOptions = {   
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    };

    let query = {};

    if (fullname) {
        // Split fullname into parts
        const nameParts = fullname.trim().split(' ');
        const lastname = nameParts.pop(); // Assume last part is the last name
        const firstname = nameParts.join(' '); // Join the rest as first name
    
        query = {
            $or: [
                { firstname: new RegExp(fullname, 'i') }, // Match full name as first name
                { lastname: new RegExp(fullname, 'i') }, // Match full name as last name
                { firstname: new RegExp(firstname, 'i'), lastname: new RegExp(lastname, 'i') } // Match split parts
            ]
        };
    }

    const users = await Userdetails.find(query)
    .skip(pageOptions.page * pageOptions.limit)
    .limit(pageOptions.limit)
    .sort({ 'createdAt': -1 })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem getting users. Error ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details." });
    });

    if (users.length <= 0) {
        return res.json({ message: "success", data: {
            list: [],
            totalpages: 0
        }});
    }

    const totalpages = await Userdetails.countDocuments(query)
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem getting users. Error ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details." });
    });

    
    const pages = Math.ceil(totalpages / pageOptions.limit)

    const data = {
        list: [],
        totalpages: pages
    };

    users.forEach(tempdata => {
        const { owner, firstname, lastname } = tempdata;

        data.list.push({
            userid: owner,
            firstname: firstname,
            lastname: lastname
        });
    });

    return res.json({ message: "success", data: data });

}

exports.deleteuser = async (req, res) => {
    const {userid} = req.body

    await Users.deleteOne({_id: new mongoose.Types.ObjectId(userid)})

    await Userdetails.deleteOne({owner: new mongoose.Types.ObjectId(userid)})

    await Storyassessment.deleteMany({owner: new mongoose.Types.ObjectId(userid)})

    return res.json({message: "success"})
}