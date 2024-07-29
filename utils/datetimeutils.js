const moment = require('moment');

exports.convertdatetime = (datetime) => {
    // Sample MongoDB date (ISO format)
    const mongoDate = new Date(datetime);

    // Convert MongoDB date to desired format
    const formattedDate = moment(mongoDate).format('MM/DD/YYYY h:mma');

    return formattedDate;
}