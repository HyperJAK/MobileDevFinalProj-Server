const express = require("express")
const app = express()
const port = 4000
const cors = require("cors")
const mysql = require ('mysql2')
const {json, urlencoded} = require("express");
require('dotenv').config();

app.use(json({ limit: '50mb' }));
app.use(urlencoded({ limit: '50mb', extended: true }));
app.use(cors())


const db = mysql.createConnection({
    host: process.env.MYSQL_SERVER_DB_IP,
user: process.env.MYSQL_SERVER_USER_NAME,
    password: process.env.MYSQL_SERVER_USER_PASSWORD,
    database: process.env.MYSQL_SERVER_DB_NAME
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
                id: results[0].id,
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
    console.log(req.body)
    const { email, encryptedPass, username, profilePic } = req.body;

    console.log(email)
    console.log(encryptedPass)

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
            console.log(userData)
            res.json({ message: 'Logged in succesfully!', data:userData });
        }
    });
});


app.post('/getUserId', (req,res) => {
    const { email} = req.body;

    console.log(email)

    const sql = 'SELECT id FROM accounts WHERE email = ?';

    db.query(sql, [email], (error, results) => {
        if (error) {
            console.error('Error:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }

        if(results.length == 0){
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const id = results[0].id;

        if (results.length === 1) {
            const userData = {
                id
            };
            console.log(userData)
            res.json({ message: 'Logged in succesfully!', user:userData });
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


    const {email} = req.body;

    const sql = (`
      SELECT distinct 
        t.id AS tripId, t.trip_name, 
        f.flightId, f.name AS flightName, f.departure_time, 
        fldep.id AS departureLocationId, fldep.city AS departureCity, fldep.address AS departureAddress, fldep.description AS departureDescription, fldep.latitude AS departureLatitude, fldep.longitude AS departureLongitude, fldep.timeZone AS departureTimeZone, 
        fldest.id AS destinationLocationId, fldest.city AS destinationCity, fldest.address AS destinationAddress, fldest.description AS destinationDescription, fldest.latitude AS destinationLatitude, fldest.longitude AS destinationLongitude, fldest.timeZone AS destinationTimeZone, 
        h.hotelId, h.name AS hotelName, h.description AS hotelDescription, h.rating, 
        hloc.id AS hotelLocationId, hloc.city AS hotelCity, hloc.address AS hotelAddress, hloc.description AS hotelDescription, hloc.latitude AS hotelLatitude, hloc.longitude AS hotelLongitude, hloc.timeZone AS hotelTimeZone, 
        r.roomId, r.size AS roomSize, r.price AS roomPrice 
        
      FROM trips t
      JOIN flights f ON t.flight_id = f.flightId
      JOIN location fldep ON f.departure_location = fldep.id
      JOIN location fldest ON f.destination = fldest.id
      JOIN hotels h ON t.booked_roomId = h.hotelId
      JOIN location hloc ON h.location = hloc.id
      JOIN rooms r ON t.booked_roomId = r.roomId
      JOIN accounts a ON t.user_id = a.id
      WHERE a.email = ?
    `);


    db.query(sql, [email], (error, results) => {
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
                    trip_name: row.trip_name,
                    flight: {
                        flightId: row.flightId,
                        flightName: row.flightName,
                        departure_time: row.departure_time,
                        departureLocation: {
                            id: row.departureLocationId,
                            city: row.departureCity,
                            address: row.departureAddress,
                            description: row.departureDescription,
                            latitude: row.departureLatitude,
                            longitude: row.departureLongitude,
                            timeZone: row.departureTimeZone,
                        },
                        destinationLocation: {
                            id: row.destinationLocationId,
                            city: row.destinationCity,
                            address: row.destinationAddress,
                            description: row.destinationDescription,
                            latitude: row.destinationLatitude,
                            longitude: row.destinationLongitude,
                            timeZone: row.destinationTimeZone,
                        }
                    },
                    hotel: {
                        hotelId: row.hotelId,
                        hotelName: row.hotelName,
                        hotelDescription: row.hotelDescription,
                        rating: row.rating,
                        hotelLocation: {
                            id: row.hotelLocationId,
                            city: row.hotelCity,
                            address: row.hotelAddress,
                            description: row.hotelDescription,
                            latitude: row.hotelLatitude,
                            longitude: row.hotelLongitude,
                            timeZone: row.hotelTimeZone,
                        }
                    },
                    room: {
                        roomId: row.roomId,
                        size: row.roomSize,
                        price: row.roomPrice
                    }
                }));


            res.json({message: 'Flights Data Received!', jsonData: jsonObject});
        }
    });
});


app.post("/getFlightImages", async (req, res) => {

    const {flightId} = req.body

    const sqlFlights = (`
    select * from flightImages where flightId = ?;
    `);


    db.query(sqlFlights,[flightId], (error, results) => {
        if (error) {
            console.error('Error:', error);
            return res.status(500).json({error: 'Internal server error.'});
        }

        if (results.length == 0) {
            return res.status(401).json({error: 'There are no flights at this moment.'});
        }


        if (results.length >= 1) {
            console.log(results)
            const jsonFlightImages = results.map(row => ({
                flight: {
                    id: row.id,
                    alt: row.alt,
                    imageHDUrl: row.imageHDUrl,
                    imageUrl: row.imageUrl,
                    flightId: row.flightId,
                }
            }));


            res.json({message: 'Flights Images Received!', jsonFlightImages: jsonFlightImages});
        }
    });
});

app.post("/getHotelImages", async (req, res) => {

    const {hotelId} = req.body

    const sqlHotels = (`
    select * from hotelimages where hotelId = ?;
    `);


    db.query(sqlHotels,[hotelId], (error, results) => {
        if (error) {
            console.error('Error:', error);
            return res.status(500).json({error: 'Internal server error.'});
        }

        if (results.length == 0) {
            return res.status(401).json({error: 'There are no hotels at this moment.'});
        }


        if (results.length >= 1) {
            console.log(results)
            const jsonHotelImages = results.map(row => ({
                hotel: {
                    id: row.id,
                    alt: row.alt,
                    imageHDUrl: row.imageHDUrl,
                    imageUrl: row.imageUrl,
                    hotelId: row.hotelId,
                }
            }));


            res.json({message: 'Hotel Images Received!', jsonHotelImages: jsonHotelImages});
        }
    });
});


app.post("/getRoomImages", async (req, res) => {

    const {roomId} = req.body

    const sqlRooms = (`
    select * from roomImages where roomId = ?;
    `);


    db.query(sqlRooms,[roomId], (error, results) => {
        if (error) {
            console.error('Error:', error);
            return res.status(500).json({error: 'Internal server error.'});
        }

        if (results.length == 0) {
            return res.status(401).json({error: 'There are no rooms at this moment.'});
        }


        if (results.length >= 1) {
            console.log(results)
            const jsonRoomImages = results.map(row => ({
                room: {
                    id: row.id,
                    alt: row.alt,
                    imageHDUrl: row.imageHDUrl,
                    imageUrl: row.imageUrl,
                    roomId: row.roomId,
                }
            }));


            res.json({message: 'Room Images Received!', jsonRoomImages: jsonRoomImages});
        }
    });
});


app.post("/addNewTrip", async (req, res) => {

    const {tripName,id,userTrip} = req.body

    const sqlRooms = (`
    INSERT INTO trips (trip_name, user_id, flight_id, booked_roomId) VALUES(?, ?, ?, ?);
    `);


    db.query(sqlRooms,[tripName,id,userTrip[0].flight,userTrip[0].hotel], (error, results) => {
        if (error) {
            console.error('Error:', error);
            return res.status(500).json({error: 'Internal server error.'});
        }

        if (results.length == 0) {
            return res.status(401).json({error: 'There are no rooms at this moment.'});
        }


        if (results.length >= 1) {
            console.log(results)

        }
    });
});

app.post("/getRooms", async (req, res) => {

    const {hotelId} = req.body

    const sqlRooms = (`
    select * from rooms where hotelId = ?;
    `);

    console.log('Hotel ID: ' + hotelId)


    db.query(sqlRooms,[hotelId], (error, results) => {
        if (error) {
            console.error('Error:', error);
            return res.status(500).json({error: 'Internal server error.'});
        }

        if (results.length == 0) {
            return res.status(401).json({error: 'There are no rooms at this moment.'});
        }


        if (results.length >= 1) {
            console.log(results)
            const jsonRooms = results.map(row => ({
                room: {
                    roomId: row.roomId,
                    price: row.price,
                    size: row.size,
                    hotelId: row.hotelId
                }
            }));

            console.log('JSON' + jsonRooms)


            res.json({message: 'Room Images Received!', jsonCurrentHotelRooms: jsonRooms});
        }
    });
});

app.post("/getAllHotels", (req,res)=> {
    const { destination } = req.body;
    if(destination=='') {return}
    console.log(req.body)
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
        console.log('getting hotel info...')
    
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
    WHERE l.city LIKE ?
    GROUP BY
        h.hotelId, h.name, h.rating, h.description,
        l.address, l.city, l.latitude, l.longitude,
        l.description, l.timeZone
        ORDER BY h.rating DESC;
    `
        db.query(sql, ['%' + destination + '%'] ,(error, results) => {
            if (error) {
                console.error('Error:', error);
                return res.status(500).json({ error: 'Internal server error.' });
            }
    
            if(results.length == 0){
                return res.status(404).json({ error: 'There are no hotels at this moment.' });
            }

    
            if (results.length >= 1) {
                console.log(results)
                res.json({ message: 'Hotels Data Received!', data:results });
            }
        });
    });

app.post("/getTopHotels", (req,res)=> {

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
    console.log('getting hotel info...')

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
    l.description, l.timeZone
    ORDER BY h.rating DESC
    LIMIT 3;
`
    db.query(sql, (error, results) => {
        if (error) {
            console.error('Error:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }

        if(results.length == 0){
            return res.status(401).json({ error: 'There are no hotels at this moment.' });
        }



        if (results.length >= 1) {
            console.log(results)
            res.json({ message: 'Hotels Data Received!', data:results });
        }
    });
});

app.listen(port, () => {
    console.log(`Listening at http://${process.env.MYSQL_SERVER_DB_IP}:${port}`)
})