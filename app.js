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

        app.listen(3004, () =>
            console.log("Server Running at http://localhost:3004/")
        );
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
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
        jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
        response.status(401);
        response.send("Invalid JWT Token");
    } else {
        jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
            if (error) {
                response.status(401);
                response.send("Invalid JWT Token");
            } else {
                next();
            }
        });
    }
}

app.post("/login/", async (request, response) => {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
    const databaseUser = await database.get(selectUserQuery);
    if (databaseUser === undefined) {
        response.status(400);
        response.send("Invalid user");
    } else {
        const isPasswordMatched = await bcrypt.compare(
            password,
            databaseUser.password
        );
        if (isPasswordMatched === true) {
            const payload = {
                username: username,
            };
            const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
            response.send({ jwtToken });
        } else {
            response.status(400);
            response.send("Invalid password");
        }
    }
});

app.post("/register", async (request, response) => {
    const { username, name, password, gender, location } = request.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
    const databaseUser = await database.get(selectUserQuery);

    if (databaseUser === undefined) {
        const createUserQuery = `
    INSERT INTO
        user (username, name, password, gender, location)
        VALUES
        (
        '${username}',
        '${name}',
        '${hashedPassword}',
        '${gender}',
        '${location}'  
        );`;
        if (validatePassword(password)) {
            await database.run(createUserQuery);
            response.send("User created successfully");
        } else {
            response.status(400);
            response.send("Password is too short");
        }
    } else {
        response.status(400);
        response.send("User already exists");
    }
});

