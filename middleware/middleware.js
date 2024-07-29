const Users = require("../models/Users")
const Staffusers = require("../models/Staffusers")
const fs = require('fs');
const path = require("path");
const publicKey = fs.readFileSync(path.resolve(__dirname, "../keys/public-key.pem"), 'utf-8');
const jsonwebtokenPromisified = require('jsonwebtoken-promisified');

const verifyJWT = async (token) => {
    try {
        const decoded = await jsonwebtokenPromisified.verify(token, publicKey, { algorithms: ['RS256'] });
        return decoded;
    } catch (error) {
        console.error('Invalid token:', error.message);
        throw new Error('Invalid token');
    }
};

exports.protectplayer = async (req, res, next) => {
    const token = req.headers.authorization

    if (!token){
        return res.status(401).json({ message: 'Unauthorized', data: "You don't have enough access to view this page." });
    }

    try{
        if (!token.startsWith("Bearer")){
            return res.status(401).json({ message: 'Unauthorized', data: "You don't have enough access to view this page." });
        }
        const headerpart = token.split(' ')[1]

        const decodedToken = await verifyJWT(headerpart);

        if (decodedToken.auth != "student"){
            return res.status(401).json({ message: 'Unauthorized', data: "You don't have enough access to view this page." });
        }

        const user = await Users.findOne({username: decodedToken.username})
        .then(data => data)

        if (!user){
            return res.status(401).json({ message: 'Unauthorized', data: "You don't have enough access to view this page." });
        }

        if (decodedToken.token != user.token){
            return res.status(401).json({ message: 'duallogin', data: `Your account had been opened on another device! You will now be logged out.` });
        }

        req.user = decodedToken;
        next();
    }
    catch(ex){
        return res.status(401).json({ message: 'Unauthorized', data: "You don't have enough access to view this page." });
    }
}

exports.protectadmin = async (req, res, next) => {
    const token = req.headers.authorization

    if (!token){
        return res.status(401).json({ message: 'Unauthorized', data: "You don't have enough access to view this page." });
    }

    try{
        if (!token.startsWith("Bearer")){
            return res.status(401).json({ message: 'Unauthorized', data: "You don't have enough access to view this page." });
        }
        const headerpart = token.split(' ')[1]

        const decodedToken = await verifyJWT(headerpart);

        if (decodedToken.auth != "admin"){
            return res.status(401).json({ message: 'Unauthorized', data: "You don't have enough access to view this page." });
        }

        const user = await Staffusers.findOne({username: decodedToken.username})
        .then(data => data)

        if (!user){
            return res.status(401).json({ message: 'Unauthorized', data: "You don't have enough access to view this page." });
        }

        if (decodedToken.token != user.token){
            return res.status(401).json({ message: 'duallogin', data: `Your account had been opened on another device! You will now be logged out.` });
        }

        req.user = decodedToken;
        next();
    }
    catch(ex){
        return res.status(401).json({ message: 'Unauthorized', data: "You don't have enough access to view this page." });
    }
}