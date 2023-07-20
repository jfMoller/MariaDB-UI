import express from "express";
import mariadb from "mariadb";
import { credentials } from "./credentials.js";

const port = 8082;
const server = express();
server.use(express.json());

server.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

const pool = mariadb.createPool({
  host: credentials.host,
  user: credentials.user,
  password: credentials.password,
  database: credentials.database,
});

server.listen(port, () => {
  pool.getConnection().then((conn) => {
    console.log(`Connected to MariaDB!`);
    console.log(`Listening on http://localhost:${port}`);
    conn.release();
  }).catch((err) => {
    console.error(`Error connecting to MariaDB: ${err}`);
  });
});

server.get("/tables", (req, res) => {
  pool.getConnection().then((conn) => {
    conn.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")
      .then((rows) => {
        const tableTitles = rows.map((row) => Object.values(row)[0]);
        const databaseTitle = credentials.database;
        res.json({ databaseTitle, tableTitles });
      })
      .catch((err) => {
        console.error(`Error executing query: ${err}`);
        res.status(500).json({ error: `An error occurred while fetching table names: ${err}` });
      })
      .finally(() => {
        conn.release();
      });
  });
});

server.post("/tables", (req, res) => {
  pool.getConnection().then((conn) => {
    const { data }= req.body;

    conn.query(`SELECT * FROM ${data}`)
      .then((rows) => {
        res.json(rows);
      })
      .catch((err) => {
        console.error(`Error executing query: ${err}`);
        res.status(500).json({ error: `An error occurred while fetching data: ${err}` });
      })
      .finally(() => {
        conn.release();
      });
  }).catch((err) => {
    console.error(`Error getting database connection: ${err}`);
    res.status(500).json({ error: `An error occurred while connecting to the database: ${err}` });
  });
});

server.post("/rows", (req, res) => {
  pool.getConnection().then((conn) => {
    const { data }= req.body;

    conn.query(`SELECT * FROM ${data.tableName} WHERE id = ${data.rowID} LIMIT 1`)
      .then((row) => {
        res.json(row[0]);
      })
      .catch((err) => {
        console.error(`Error executing query: ${err}`);
        res.status(500).json({ error: `An error occurred while fetching data: ${err}` });
      })
      .finally(() => {
        conn.release();
      });
  }).catch((err) => {
    console.error(`Error getting database connection: ${err}`);
    res.status(500).json({ error: `An error occurred while connecting to the database: ${err}` });
  });
});

server.put("/rows/edit", (req, res) => {
  pool.getConnection().then((conn) => {
    const { data } = req.body;
    const { personnr, ...updateData } = data.editedData;

    // Convert the date string to the correct format ('YYYY-MM-DD')
    const personnrFormatted = new Date(personnr).toISOString().slice(0, 10);

    const updateValues = Object.keys(updateData)
      .map((col) => `${col} = ${conn.escape(updateData[col])}`)
      .join(", ");

    // Use the formatted date in the update query
    conn.query(`UPDATE ${data.tableName} SET personnr = ${conn.escape(personnrFormatted)}, ${updateValues} WHERE id = ${conn.escape(data.editedData.id)}`)
      .then(() => {
        res.json({ message: "Row updated successfully." });
      })
      .catch((err) => {
        console.error(`Error executing update query: ${err}`);
        res.status(500).json({ error: `An error occurred while updating data: ${err}` });
      })
      .finally(() => {
        conn.release();
      });
  }).catch((err) => {
    console.error(`Error getting database connection: ${err}`);
    res.status(500).json({ error: `An error occurred while connecting to the database: ${err}` });
  });
});