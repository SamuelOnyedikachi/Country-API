import express from "express";
import dotenv from "dotenv";
import countriesRouter from "./routes/countries.js";

dotenv.config();

const app = express();
app.use(express.json());

// Routes
app.use("/countries", countriesRouter);

app.get("/status", (req, res) => {
    res.json({message: "API is running..."});
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`server running on port ${PORT}`));