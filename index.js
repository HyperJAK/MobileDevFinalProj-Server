const express = require("express")
const app = express()
const port = 4000
const cors = require("cors")
const mysql = require ('mysql2')
const {json, urlencoded} = require("express");

app.use(json({ limit: '50mb' }));
app.use(urlencoded({ limit: '50mb', extended: true }));
app.use(cors())


const db = mysql.createConnection({
    host: 'localhost',
    user: 'JAK',
    password: 'jak1',
    database: 'mobiledevdb'
});


app.get("/", cors(), async (req, res) =>{
    res.send("This is working")
});


app.post('/updateUserInfo', async (req, res) => {
    try {
        const { user, newEmail, encryptedPass, newUsername } = req.body;
        console.log('Updating user: ')
        console.log(user);

        /*if (!req.file) {
            return res.status(400).json({ error: 'No file provided.' });
        }*/

        // Your SQL query to update the user profile picture
        const sql = 'UPDATE accounts SET email = ?, password = ?, username = ? WHERE email = ?';

        db.query(sql, [newEmail, encryptedPass, newUsername, user.email], (error, results) => {
            if (error) {
                console.error('Error updating user profile picture:', error);
                return res.status(500).json({ error: 'Internal server error.' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'User not found.' });
            }

            res.status(200).json({ message: 'User profile picture updated successfully.' });
            console.log(results.affectedRows)
        });

    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});


app.post('/updateUserPic', async (req, res) => {
    try {
        const { user } = req.body;
        console.log('Updating user with email: ')
        console.log(user.email)

        /*if (!req.file) {
            return res.status(400).json({ error: 'No file provided.' });
        }*/

        // Your SQL query to update the user profile picture
        const sql = 'UPDATE accounts SET profilePic = ? WHERE email = ?';

        db.query(sql, [user.image, user.email], (error, results) => {
            if (error) {
                console.error('Error updating user profile picture:', error);
                return res.status(500).json({ error: 'Internal server error.' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'User not found.' });
            }

            res.status(200).json({ message: 'User profile picture updated successfully.' });
            console.log(results.affectedRows)
        });

    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});


// The sign up part
app.post('/signup', (req, res)=> {
    const { email, encryptedPass, username, profilePic } = req.body;
    const sql = 'SELECT id FROM accounts WHERE email = ?';

    if (!email || !encryptedPass) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    db.query(sql, [email], (error, results) => {
        if (error) {
          console.error('Error:', error);
          return res.status(500).json({ error: 'Internal server error.' });
        }
        if (results.length > 0) {
            return res.status(409).json({ error: 'User already exists.' });
        }

        const newUser = {
            _username: username,
            _email: email,
            _password: encryptedPass,
            _profilePic: profilePic
        };

        db.query('INSERT INTO accounts(username,email,password,profilePic,authenticated) VALUES(?,?,?,?,?)', [newUser._username,newUser._email, newUser._password, newUser._profilePic, false], (error) => {
            if (error) {
              console.error('Error:', error);
              return res.status(500).json({ error: 'Internal server error.' });
            }
      
            // Send a response
            const userData = {
                username: username,
                email,
                encryptedPass
            };
            res.json({ message: 'User signed up successfully!' , data:userData});
        });
    });
});
// The login part
app.post('/login', (req,res) => {
    const { email, encryptedPass, username, profilePic } = req.body;

    const sql = 'SELECT * FROM accounts WHERE email = ?';

    if (!email || !encryptedPass) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    db.query(sql, [email], (error, results) => {
        if (error) {
            console.error('Error:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }

        if(results.length == 0){
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const id = results[0].id;
        const username = results[0].username;
        const email = results[0].email;
        const password = results[0].password;
        const profilePic = results[0].profilePic;
        const authenticated = results[0].authenticated;

        if (results.length === 1) {
            const userData = {
                id,
                username,
                email,
                password,
                profilePic,
                authenticated
            };
            res.json({ message: 'User info retrieved!', data:userData });
        }
    });
});

app.post("/getAllFlights", (req,res)=> {

    const sql = `
    SELECT flights.flightId,
    flights.name,
    flights.departure_time,
    loc1.city as 'departure',
    loc2.city as 'destination',
    JSON_ARRAYAGG(JSON_OBJECT('imageAlt', flightimages.alt, 'imageHDUrl', flightimages.imageHDUrl, 'imageUrl', flightimages.imageUrl )) AS ImageArray
   FROM flights,flightimages,location loc1, location loc2
   WHERE flightimages.flightId = flights.flightId 
   AND flights.departure_location = loc1.id 
   AND flights.destination = loc2.id
   GROUP BY flights.flightId
    `;
    // sponsored by chatgpt

    db.query(sql, (error, results) => {
        if (error) {
            console.error('Error:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }
        
        if(results.length == 0){
            return res.status(401).json({ error: 'There are no flights at this moment.' });
        }

        

        if (results.length >= 1) {
            console.log(results)
            res.json({ message: 'Flights Data Received!', data:results });
        }
    });
});

app.post("/getAllTrips", async (req, res) => {

    const sql = (`
      SELECT distinct 
        t.id AS tripId, t.trip_name, 
        f.flightId, f.name AS flightName, f.departure_time, 
        fldep.id AS departureLocationId, fldep.city AS departureCity, fldep.address AS departureAddress, fldep.description AS departureDescription, fldep.latitude AS departureLatitude, fldep.longitude AS departureLongitude, fldep.timeZone AS departureTimeZone, 
        fldest.id AS destinationLocationId, fldest.city AS destinationCity, fldest.address AS destinationAddress, fldest.description AS destinationDescription, fldest.latitude AS destinationLatitude, fldest.longitude AS destinationLongitude, fldest.timeZone AS destinationTimeZone, 
        fi.id AS flightImageId, fi.alt AS flightImageAlt, fi.imageUrl AS flightImageUrl, fi.imageHDUrl AS flightImageHDUrl, 
        h.hotelId, h.name AS hotelName, h.description AS hotelDescription, h.rating, 
        hloc.id AS hotelLocationId, hloc.city AS hotelCity, hloc.address AS hotelAddress, hloc.description AS hotelDescription, hloc.latitude AS hotelLatitude, hloc.longitude AS hotelLongitude, hloc.timeZone AS hotelTimeZone, 
        hi.id AS hotelImageId, hi.alt AS hotelImageAlt, hi.imageUrl AS hotelImageUrl, hi.imageHDUrl AS hotelImageHDUrl, 
        r.roomId, r.size AS roomSize, r.price AS roomPrice, 
        ri.id AS roomImageId, ri.alt AS roomImageAlt, ri.imageUrl AS roomImageUrl, ri.imageHDUrl AS roomImageHDUrl
      FROM trips t
      JOIN flights f ON t.flight_id = f.flightId
      JOIN location fldep ON f.departure_location = fldep.id
      JOIN location fldest ON f.destination = fldest.id
      JOIN flightImages fi ON f.flightId = fi.flightId
      JOIN hotels h ON t.booked_roomId = h.hotelId
      JOIN hotelImages hi ON h.hotelId = hi.hotelId
      JOIN location hloc ON h.location = hloc.id
      JOIN rooms r ON t.booked_roomId = r.roomId
      JOIN roomImages ri ON r.roomId = ri.roomId
      JOIN accounts a ON t.user_id = a.id
      WHERE a.email = 'userAF@example.com'
    `);


    db.query(sql, (error, results) => {
        if (error) {
            console.error('Error:', error);
            return res.status(500).json({error: 'Internal server error.'});
        }

        if (results.length == 0) {
            return res.status(401).json({error: 'There are no flights at this moment.'});
        }


        if (results.length >= 1) {
            console.log(results)
            const jsonObject = results.map(row => ({
                tripId: row.tripId,
                tripName: row.trip_name,
                flight: {
                    flightId: row.flightId,
                    flightName: row.flightName,
                    departure: {
                        locationId: row.departureLocationId,
                        city: row.departureCity,
                        address: row.departureAddress,
                        description: row.departureDescription,
                        latitude: row.departureLatitude,
                        longitude: row.departureLongitude,
                        timeZone: row.departureTimeZone,
                    },
                    destination: {
                        locationId: row.destinationLocationId,
                        city: row.destinationCity,
                        address: row.destinationAddress,
                        description: row.destinationDescription,
                        latitude: row.destinationLatitude,
                        longitude: row.destinationLongitude,
                        timeZone: row.destinationTimeZone,
                    },
                    flightImageId: row.flightImageId,
                    flightImageAlt: row.flightImageAlt,
                    flightImageUrl: row.flightImageUrl,
                    flightImageHDUrl: row.flightImageHDUrl,
                },
                hotel: {
                    hotelId: row.hotelId,
                    hotelName: row.hotelName,
                    hotelDescription: row.hotelDescription,
                    rating: row.rating,
                    location: {
                        locationId: row.hotelLocationId,
                        city: row.hotelCity,
                        address: row.hotelAddress,
                        description: row.hotelDescription,
                        latitude: row.hotelLatitude,
                        longitude: row.hotelLongitude,
                        timeZone: row.hotelTimeZone,
                    },
                    hotelImageId: row.hotelImageId,
                    hotelImageAlt: row.hotelImageAlt,
                    hotelImageUrl: row.hotelImageUrl,
                    hotelImageHDUrl: row.hotelImageHDUrl,
                },
                room: {
                    roomId: row.roomId,
                    roomSize: row.roomSize,
                    roomPrice: row.roomPrice,
                    roomImageId: row.roomImageId,
                    roomImageAlt: row.roomImageAlt,
                    roomImageUrl: row.roomImageUrl,
                    roomImageHDUrl: row.roomImageHDUrl,
                },
            }));

            console.log(jsonObject)

            res.json({message: 'Flights Data Received!', data: jsonObject});
        }
    });
});


app.post("/getAllHotels", (req,res)=> {

//     const sql1 = `
//     SELECT hotels.hotelId,
//  hotels.name,
//  hotels.rating,
//  hotels.description,
//  location.city as 'location',
//  JSON_ARRAYAGG(JSON_OBJECT('imageAlt', hotelimages.alt, 'imageHDUrl', hotelimages.imageHDUrl, 'imageUrl', hotelimages.imageUrl )) AS ImageArray
// FROM hotels, location, hotelimages
// WHERE hotels.hotelId = hotelimages.hotelId
// AND hotels.location = location.id
// GROUP BY hotels.hotelId
//     `;
    // sponsored by chatgpt

    const sql = `
    SELECT
    h.hotelId,
    h.name AS hotelName,
    h.rating,
    h.description AS hotelDescription,
    l.address AS hotelAddress,
    l.city AS hotelCity,
    l.latitude AS hotelLatitude,
    l.longitude AS hotelLongitude,
    l.description AS locationDescription,
    l.timeZone AS locationTimeZone,
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'roomId', r.roomId,
                'price', r.price,
                'size', r.size,
                'images', riArray.ImagesArray
            )
        )
        FROM Rooms r
        LEFT JOIN (
            SELECT
                ri.roomId,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'imageId', ri.id,
                        'alt', ri.alt,
                        'imageHDUrl', ri.imageHDUrl,
                        'imageUrl', ri.imageUrl
                    )
                ) AS ImagesArray
            FROM RoomImages ri
            GROUP BY ri.roomId
        ) AS riArray ON r.roomId = riArray.roomId
        WHERE r.hotelId = h.hotelId
    ) AS rooms,
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'imageId', hi.id,
                'alt', hi.alt,
                'imageHDUrl', hi.imageHDUrl,
                'imageUrl', hi.imageUrl
            )
        )
        FROM HotelImages hi
        WHERE hi.hotelId = h.hotelId
    ) AS hotelImages
FROM Hotels h
LEFT JOIN Location l ON h.location = l.id
GROUP BY
    h.hotelId, h.name, h.rating, h.description,
    l.address, l.city, l.latitude, l.longitude,
    l.description, l.timeZone;
`
    db.query(sql, (error, results) => {
        if (error) {
            console.error('Error:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }

        if(results.length == 0){
            return res.status(401).json({ error: 'There are no flights at this moment.' });
        }



        if (results.length >= 1) {
            console.log(results)
            res.json({ message: 'Flights Data Received!', data:results });
        }
    });
});

app.listen(port, () => {
    console.log(`Listening at http://localhosty:${port}`)
})