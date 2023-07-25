const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const databasePath = path.join(__dirname, "usersData.db");

const app = express();

app.use(express.json());
app.use(cors());

let database = null;

const initializeDbAndServer = async () => {
    try {
        database = await open({
            filename: databasePath,
            driver: sqlite3.Database,
        });

        await database.exec(`
        CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gmail TEXT NOT NULL,
        name TEXT NOT NULL,
        password TEXT NOT NULL
        );
    `);

        app.listen(3999, () => console.log("Server Running at http://localhost:3999/"));
    } catch (error) {
        console.log(`DB Error: ${error.message}`);
        process.exit(1);
    }
};

initializeDbAndServer();

const validatePassword = (password) => {
    return password.length > 4;
};

function authenticateToken(request, response, next) {
    // ... Existing implementation ...
}

// Register API
// Register API
app.post("/register", async (request, response) => {
    const { gmail, name, password } = request.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const selectUserQuery = `SELECT * FROM user WHERE gmail = ?;`;
    const databaseUser = await database.get(selectUserQuery, [gmail]);

    if (databaseUser === undefined) {
        const createUserQuery = `
        INSERT INTO user (gmail, name, password)
        VALUES (?, ?, ?);
    `;

        if (validatePassword(password)) {
            await database.run(createUserQuery, [gmail, name, hashedPassword]);
            response.send("User created successfully");
        } else {
            response.status(400);
            response.send("Password is too short");
        }
    } else {
        response.status(400);
        response.send("Another account is running on this GMail");
    }
});

app.get("/users", async (request, response) => {
    const getQuery = `select * from user;`
    console.log(getQuery)
    const data = await database.all(getQuery)
    console.log(data)
    response.send(data)
})

// Login API
app.post("/login", async (request, response) => {
    const { gmail, password } = request.body;
    const selectUserQuery = `SELECT * FROM user WHERE gmail = '${gmail}';`;
    const databaseUser = await database.get(selectUserQuery);
    if (databaseUser === undefined) {
        response.status(400);
        response.send("Invalid GMail");
    } else {
        const isPasswordMatched = await bcrypt.compare(password, databaseUser.password);
        if (isPasswordMatched === true) {
            const payload = {
                gmail: gmail,
            };
            const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
            response.send({ jwtToken });
        } else {
            response.status(400);
            response.send("Invalid password");
        }
    }
});

app.delete("/delete", async (request, response) => {
    const { gmail } = request.body
    const deleteQuery = `DELETE from user where gmail='${gmail}';`
    console.log(deleteQuery)
    await database.run(deleteQuery)
    response.send("Account removed")

})

module.exports = app;
