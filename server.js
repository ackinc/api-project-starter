const express = require("express");
const app = express();

app.get("/", (req, res) => res.end("OK"));

app.listen(process.env.PORT || 3000, () => console.log("Server running"));
