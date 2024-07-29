const Staffusers = require("../models/Staffusers")

exports.initserver = async () => {
    
    console.log("STARTING INITIALIZE SERVER DATA")

    const admin = await Staffusers.find()
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem getting the admin datas. Error ${err}`)

        return
    })

    if (admin.length <= 0){
        await Staffusers.create({username: "whizkidadmin", password: "2b6aBdUo1SY7", token: ""})
        .catch(err => {
            console.log(`There's a problem saving the admin datas. Error ${err}`)
    
            return
        })
    }

    console.log("DONE INITIALIZING SERVER DATA")
}