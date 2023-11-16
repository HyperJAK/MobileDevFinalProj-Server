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
    const { email, password } = req.body;
    const sql = 'SELECT id FROM account WHERE email = ?';

    if (!email || !password) {
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
            _email: email,
            _password: password,
        };

        db.query('INSERT INTO account(email,password) VALUES(?,?)', [newUser._email, newUser._password], (error) => {
            if (error) {
              console.error('Error:', error);
              return res.status(500).json({ error: 'Internal server error.' });
            }
      
            // Send a response
            const userData = {
                email,
                password
            };
            res.json({ message: 'User signed up successfully!' , data:userData});
        });
    });
});

// The login part
app.post('/login', (req,res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM account WHERE email = ? AND password = ?';

    if (!email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    db.query(sql, [email, password], (error, results) => {
        if (error) {
            console.error('Error:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }

        if(results.length == 0){
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        var id = results[0].id;
        var email = results[0].email;
        var password = results[0].password;
        var users_id = results[0].users_id;

        if (results.length == 1) {
            const userData = {
                id,
                email,
                password,
                users_id
            };
            res.json({ message: 'User logged in successfully!', data:userData });
        }
    });
});

app.post("/getUsers", (req,res)=> {

    const sqlSelect = "SELECT * FROM users";
    db.query(sqlSelect, [req.body.userId], (err, result)=>{
        res.send(result)
    });

});

app.listen(port, () => {
    console.log(`Listening at http://localhosty:${port}`)
})