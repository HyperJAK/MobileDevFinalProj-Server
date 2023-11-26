const express = require("express")
const app = express()
const port = 4000
const cors = require("cors")
const mysql = require ('mysql2')

app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(cors())


const db = mysql.createConnection({
    host: 'localhost',
    user: 'JAK',
    password: 'jak1',
    database: 'mobiledevdb'
});


app.get("/", cors(), async (req, res) =>{
    res.send("This is working")
})

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