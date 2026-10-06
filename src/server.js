import express from 'express';
import studentRoutes from './routes/studentRoutes.js';
import mongoose from "mongoose";

const port = process.env.PORT || 3000;
const app = express();

app.use(express.json());

app.use(studentRoutes);


app.use((req, res) => res.status(404).type('text/plain; charset=utf-8').send('Not found')
);

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: process.env.DB_NAME,
        });
        console.log('Connected to MongoDB')
     // await client.connect()
     //    const database = client.db(process.env.DB_NAME)
     //    await init(database)
        app.listen(port, () => console.log(`Server running on ${port}.
Press Ctrl+C to stop`));
    }catch (e){
        console.error('Failed to connect', e);
    }
}

startServer();