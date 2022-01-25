const path = require('path');
const express = require('express');

const dbHandler = require('../mongodb/handler');

const recordRoutes = express.Router();

recordRoutes.route('/').get(function (_req, res) {
  res.sendFile(path.dirname(__dirname) + '/views/index.html');
});

recordRoutes.route('/api/users').get(function(_req, res, next) {
  dbHandler.serverConnection(async function(e) {
    if (e) {
      next(e);
    } else {
      const collection = dbHandler.getCollection();
      const query = {};
      const filter = { projection: { _id: 1, username: 1 } };
      const users = await collection.find(query, filter).toArray();
      res.status(200).json(users);
    }
  }, dbHandler.closeConnection);
});

recordRoutes.route('/api/users').post(function(req, res, next) {
  const username = req.body['username'];
  dbHandler.serverConnection(async function(e) {
    if (e) {
      next(e);
    } else {
      const collection = dbHandler.getCollection();
      const userDoc = await collection.insertOne({ username: username, log: [] });
      res.status(200).json({
        'username': username,
        '_id': userDoc.insertedId
      });
    }
  }, dbHandler.closeConnection);
});

recordRoutes.route('/api/users/:id/logs').get(function(req, res, next) {
  const userId = dbHandler.makeObjectId(req.params.id);
  let userQuery = { '_id': userId };
  let logParams = {
    from: dateValParser(req.query.from, true),
    to: dateValParser(req.query.to, true),
    limit: req.query.limit ? Number.parseInt(req.query.limit, 10) : undefined,
  };

  dbHandler.serverConnection(async function(e) {
    if (e) {
      next(e);
    } else {
      const collection = dbHandler.getCollection();
      const userDoc = await dbHandler.aggregateLogs(collection, userQuery, logParams);
      res.status(200).json({
        '_id': userDoc._id,
        'username': userDoc.username,
        'count': userDoc.count,
        'log': userDoc.log.map(obj => {
          return { 'description': obj.description,
                   'duration': obj.duration,
                   'date': obj.date.toDateString() }
        })
      });
    }
  }, dbHandler.closeConnection);
});

recordRoutes.route('/api/users/:id/exercises').post(function(req, res, next) {
  const userId = dbHandler.makeObjectId(req.params.id);
  const userQuery = { '_id': userId };

  const duration = Number.parseInt(req.body['duration'], 10);
  const date = dateValParser(req.body['date']);
  const description = req.body['description']

  const exercise = {
    'description': description,
    'duration': duration,
    'date': date,
  };

  const updateDoc = {
    $push: {
      'log': exercise,
    }
  };

  dbHandler.serverConnection(async function(e) {
    if (e) {
      next(e);
    } else {
      const collection = dbHandler.getCollection();
      const exerciseDoc = await collection.findOneAndUpdate(userQuery, updateDoc);
      res.status(200).json({
        'username': exerciseDoc.value.username,
        'description': description,
        'duration': duration,
        'date': date.toDateString(),
        '_id': exerciseDoc.value._id
      });
    }
  }, dbHandler.closeConnection());
});

module.exports = recordRoutes;

// helpers

function dateValParser(param, undefinedOk) {
  let dateObj;
  let dateVal = param;

  undefinedOk = isUndefined(undefinedOk) ? false : undefinedOk;
  
  if (isUndefined(dateVal) || isEmpty(dateVal)) {
    if (undefinedOk) {
      return dateObj;
    }
    dateObj = new Date();
  } else {
    dateObj = new Date(dateVal);
  }
  dateObj.setHours(0,0,0)
  return dateObj;
}

function isUndefined(val) {
  return val === undefined;
}

function isEmpty(obj) {
  return obj.length === 0;
}