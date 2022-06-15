const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w5fhw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const productCollection = client.db('bdMotors').collection('product');
        const featureProductCollection = client.db('bdMotors').collection('featureProduct');

        app.get('/product', async (req, res) => {
            let products;

            const selectedPage = parseInt(req.query.selectedPage);
            const pageLoadSize = parseInt(req.query.pageLoadSize);
            const query = {};
            const cursor = productCollection.find(query);

            if (selectedPage || pageLoadSize) {
                products = await cursor.skip(selectedPage * pageLoadSize).limit(pageLoadSize).toArray();
            }
            else {
                products = await cursor.toArray();
            }
            // const products = await cursor.limit(5).toArray();
            res.send(products);
        });

        // show featured Products
        app.get('/featureProduct', async (req, res) => {
            const query = {};
            const cursor = featureProductCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        // show total product
        app.get('/productCount', async (req, res) => {
            const count = await productCollection.estimatedDocumentCount();
            res.send({ count });
        });

        // show a particular product details
        app.get('/inventory/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await productCollection.findOne(query);
            res.send(service);
        });

    }
    finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('BDMOTORS is running and waiting')
});

app.listen(port, () => {
    console.log('BDMOTORS is running on port', port);
})
