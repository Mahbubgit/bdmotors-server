const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();
const res = require('express/lib/response');

// middleware
app.use(cors());
app.use(express.json());

// Verify JSON Web Token
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        console.log('decoded', decoded);
        req.decoded = decoded;
        next();
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w5fhw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const productCollection = client.db('bdMotors').collection('product');
        const featureProductCollection = client.db('bdMotors').collection('featureProduct');

        // Authentication
        // app.post('/login', async (req, res) => {
        //     const user = req.body;
        //     const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        //         expiresIn: '1d'
        //     });
        //     res.send({ accessToken });
        // })

        // for pagination
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
            res.send(products);
        });

        // for home page, 6 items have to be shown
        app.get('/product/home', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.limit(6).toArray();
            res.send(products);
        });

        // show total product(For Pagination)
        app.get('/productCount', async (req, res) => {
            const count = await productCollection.estimatedDocumentCount();
            res.send({ count });
        });

        // show featured Products
        app.get('/featureProduct', async (req, res) => {
            const query = {};
            const cursor = featureProductCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        // show a particular product details
        app.get('/inventory/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        });

        // **** For update a product by decrease quantity / restock quantity *****
        app.post('/inventory/:id', async (req, res) => {
            const id = req.params.id;
            const restockQuantity = parseInt(req.query.restockQuantity);

            const query = { _id: ObjectId(id) };
            const filter = await productCollection.findOne(query);
            const previousQuantity = parseInt(filter.quantity);
            // console.log(id, restockQuantity, previousQuantity);
            let updateDoc;
            const options = { upsert: true };

            if (restockQuantity) {
                updateDoc = {
                    $set: {
                        quantity: previousQuantity + restockQuantity,
                    },
                }
            }
            else {
                updateDoc = {
                    $set: {
                        quantity: previousQuantity - 1,
                    },
                }
            }

            const result = await productCollection.updateOne(filter, updateDoc, options);

            restockQuantity ?
                console.log(
                    `Restock ${result.modifiedCount} document`,
                )
                :
                console.log(
                    `Decrease quantity of ${result.modifiedCount} document`,
                )

            res.send(result);
        });

        // For Delete a item
        app.delete('/inventory/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            if (result.deletedCount === 1) {
                console.log("Successfully deleted one document.");
            }
            res.send(result);
        });

        // verify email by JWT Token

        // app.get('/product', verifyJWT, async (req, res) => {
        //     const decodedEmail = req.decoded.email;
        //     const email = req.query.email;
        //     if (email === decodedEmail) {
        //         const query = { email: email };
        //         const cursor = productCollection.find(query);
        //         const result = await cursor.toArray();
        //         res.send(result);
        //     }
        //     else {
        //         res.status(403).send({ message: 'forbidden access' })
        //     }
        // })

        // For add a new item
        app.post('/product', async (req, res) => {
            const addNewItem = req.body;
            const result = await productCollection.insertOne(addNewItem);
            res.send(result);
        });

        app.get('/product/myItem', async (req, res) => {
            const email = req.query.email;
            const query = {email: email};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

    }
    finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('BDMOTORS is running')
});

app.listen(port, () => {
    console.log('BDMOTORS is running on port', port);
})
