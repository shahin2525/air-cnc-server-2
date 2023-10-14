const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const morgan = require("morgan");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ax6qyiu.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
// verifyJwt
const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized Access" });
  }
  const token = authorization.split(" ")[1];
  // verify token
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "Unauthorized Access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    const usersCollection = client.db("airCncDB2").collection("users");
    const roomsCollection = client.db("airCncDB2").collection("rooms");
    const bookingsCollection = client.db("airCncDB2").collection("bookings");

    // generate jwt token
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.send({ token });
    });

    // put users

    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });
    // get role
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });
    // get all rooms
    app.get("/rooms", async (req, res) => {
      const rooms = await roomsCollection.find().toArray();
      res.send(rooms);
    });
    // get single room;
    app.get("/room/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.findOne(query);
      res.send(result);
    });
    // Save a room in database
    app.post("/rooms", async (req, res) => {
      const room = req.body;

      const result = await roomsCollection.insertOne(room);
      res.send(result);
    });

    // update room booking status
    app.patch("/rooms/status/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          booked: status,
        },
      };
      const result = await roomsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // get all rooms for host
    app.get("/rooms/:email", verifyJwt, async (req, res) => {
      const decodedEmail = req.decoded.email;

      const email = req.params.email;
      if (email !== decodedEmail) {
        return res.status(403).send({
          error: true,
          message: "Forbidden Access",
        });
      }

      const query = { "hostData.email": email };
      const result = await roomsCollection.find(query).toArray();
      res.send(result);
    });
    // delete room
    app.delete("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.deleteOne(query);
      res.send(result);
    });
    // Get bookings for host

    //  get booking for host
    app.get("/bookings/host", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { host: email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    // Get bookings for guest
    app.get("/bookings", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        res.send([]);
      }
      const query = { "guest.email": email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });
    // Save a bookingInfo in database
    app.post("/bookings", async (req, res) => {
      const bookings = req.body;

      const result = await bookingsCollection.insertOne(bookings);
      res.send(result);
    });

    // delete a booking

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("AirCNC Server is running..");
});

app.listen(port, () => {
  console.log(`AirCNC is running on port ${port}`);
});
