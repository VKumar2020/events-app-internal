'use strict';

// express is a nodejs web server
// https://www.npmjs.com/package/express
const express = require('express');

// converts content in the request into parameter req.body
// https://www.npmjs.com/package/body-parser
const bodyParser = require('body-parser');

// bring in firestore
const Firestore = require("@google-cloud/firestore");

// configure with current project
const firestore = new Firestore(
    {
        projectId: process.env.GOOGLE_CLOUD_PROJECT
    }
);

// create the server
const app = express();

// the backend server will parse json, not a form request
app.use(bodyParser.json());


// mock events data - for a real solution this data should be coming 
// from a cloud data store
 const mockEvents = {
    events: [
        { title: 'CND Workshop Day 1', id: 1, description: 'Cloud Native Development Bootcamp Day 1',date: 'April 6th 2020', location: 'Orlando', likes: 0 },
        { title: 'CND Workshop Day 2', id: 1, description: 'Cloud Native Development Bootcamp Day 2',date: 'April 7th 2020', location: 'Lake Mary', likes: 0 },
        { title: 'CND Workshop Day 3', id: 1, description: 'Cloud Native Development Bootcamp Day 3',date: 'April 13th 2020', location: 'Zoom Room', likes:0},
       {title: 'CND Workshop Day 4', id: 1, description: 'Cloud Native Development Bootcamp Day 4',date: 'April 14th 2020', location: 'Virtual', likes:0 }
    ]
};


// health endpoint - returns an empty array
app.get('/', (req, res) => {
    res.json([]);
});

// version endpoint to provide easy convient method to demonstrating tests pass/fail
app.get('/version', (req, res) => {
    res.json({ version: '1.0.0' });
});

// responsible for retrieving events from firestore and adding 
// firestore's generated id to the returned object
function getEvents(req, res) {
    firestore.collection("Events").get()
        .then((snapshot) => {
            if (!snapshot.empty) {
                const ret = { events: [] };
                snapshot.docs.forEach(element => {
                    //get data
                    const el = element.data();
                    //get internal firestore id
                    el._id = element.id;
                    //add object to array
                    ret.events.push(el);
                }, this);
                console.log(ret);
                res.json(ret);
            } else {
                // if no data has yet been added to firestore, return mock data
                res.json(mockEvents);
            }
        })
        .catch((err) => {
            console.error('Error getting events', err);
            res.json(mockEvents);
        });
};


// mock events endpoint. this would be replaced by a call to a datastore
// if you went on to develop this as a real application.
app.get('/events', (req, res) => {
     getEvents(req, res);
    //res.json(mockEvents);
});

// Adds an event - in a real solution, this would insert into a cloud datastore.
// Currently this simply adds an event to the mock array in memory
// this will produce unexpected behavior in a stateless kubernetes cluster. 
//app.post('/event', (req, res) => {
    // create a new object from the json data and add an id
 //   const ev = { 
   //  title: req.body.title, 
    //    description: req.body.description,
    //    location: req.body.location,
    //    likes: 0,
    //    id : mockEvents.events.length + 1
   //  }
    // add to the mock array
    //mockEvents.events.push(ev);
    // return the complete array
    //res.json(mockEvents);
    // this will create the Events collection if it does not exist
   // firestore.collection("Events").add(ev).then(ret => {
       // getEvents(req, res);
        // this has been modifed to call the shared getEvents method that
// returns data from firestore
// This has been modified to insert into firestore, and then call 
// the shared getEvents method.
app.post('/event', (req, res) => {
    // create a new object from the json data. The id property
    // has been removed because it is no longer required.
    // Firestore generates its own unique ids
    const ev = {
        title: req.body.title,
        description: req.body.description,
        location: req.body.location,
        likes: 0
    }
    firestore.collection("Events").add(ev).then(ret => {
        // return events using shared method that adds __id
        getEvents(req, res);
    });
});


// function used by both like and unlike. If increment = true, a like is added.
// If increment is false, a like is removed.
function changeLikes(req, res, id, increment) {
    // return the existing objct
    firestore.collection("Events").doc(id).get()
        .then((snapshot) => {
            const el = snapshot.data();
            // if you have elements in firestore with no likes property
            if (!el.likes) {
                el.likes = 0;
            }
            // increment the likes
            if (increment) {
                el.likes++;
            }
            else {
                el.likes--;
            }
            // do the update
            firestore.collection("Events")
                .doc(id).update(el).then((ret) => {
                    // return events using shared method that adds __id
                    getEvents(req, res);
                });
        })
        .catch(err => { console.log(err) });
}

// put because this is an update. Passes through to shared method.
app.put('/event/like', (req, res) => {
    changeLikes(req, res, req.body.id, true);
});

// Passes through to shared method.
// Delete distinguishes this route from put above
app.delete('/event/like', (req, res) => {
    changeLikes(req, res, req.body.id, false);
});

// Likes an event - in a real solution, this would update a cloud datastore.
// Currently this simply increments the like counter in the mock array in memory
// this will produce unexpected behavior in a stateless kubernetes cluster. 
//app.post('/event/like', (req, res) => {
   // console.log (req.body.id);
  //  var objIndex = mockEvents.events.findIndex((obj => obj.id == req.body.id));
  //  var likes = mockEvents.events[objIndex].likes;
 //   mockEvents.events[objIndex].likes = ++likes;
 //   res.json(mockEvents);
//});

// unlikes an event - in a real solution, this would update a cloud datastore.
// Currently this simply decrements the like counter in the mock array in memory
// this will produce unexpected behavior in a stateless kubernetes cluster. 
//app.delete('/event/like', (req, res) => {
    
   // console.log (req.body.id);
   // var objIndex = mockEvents.events.findIndex((obj => obj.id == req.body.id));
  //  var likes = mockEvents.events[objIndex].likes;
  //  if (likes > 0) {
  //      mockEvents.events[objIndex].likes = --likes;
   // }
   // res.json(mockEvents);
//});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: err.message });
});

const PORT = 8082;
const server = app.listen(PORT, () => {
    const host = server.address().address;
    const port = server.address().port;

    console.log(`Events app listening at http://${host}:${port}`);
});

module.exports = app;