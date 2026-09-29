import express from 'express';
import studentRoutes from './routes/studentRoutes.js';
import {MongoClient} from "mongodb";
import {init} from "./repository/studentRepository.js"

const port = process.env.PORT || 3000;
const client = new MongoClient(process.env.MONGO_URI);
const app = express();

app.use(express.json());

app.use(studentRoutes);


app.use((req, res) => res.status(404).type('text/plain; charset=utf-8').send('Not found')
);

async function startServer() {
    try {
     await client.connect()
        const database = client.db(process.env.DB_NAME)
        await init(database)
        app.listen(port, () => console.log(`Server running on ${port}.
Press Ctrl+C to stop`));
    }catch (e){
        console.error('Failed to connect', e);
    }
}

startServer();