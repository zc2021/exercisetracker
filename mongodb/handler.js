// mongoDB
const { MongoClient, ObjectId } = require('mongodb');
const connectionString = process.env.ATLAS_URI;

const client = new MongoClient(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let dbConnection;
let dbColl;

module.exports = {
  serverConnection: function (cb) {
    client.connect(function (err, db) {
      if (err || !db) {
        return cb(err);
      }

      dbConnection = db.db('backend-api');
      dbColl = dbConnection.collection('exercisetracker');
      return cb();
    });
  },

  closeConnection: function() {
    client.close();
  },

  getDB: function() {
    return dbConnection;
  },

  getCollection: function() {
    return dbColl;
  },

  aggregateLogs: function(collection, user, logParams) {
    return collection.aggregate([
      { $match:
        user
      },
      { $project: 
        { username: 1,
          log: 
          { $filter: 
            { input: '$log',
              cond: 
              { $switch:
                { branches: 
                  [ { case: { $and: [ logParams.to, logParams.from] },
                      then: {
                        $and: 
                        [
                          { $gte: ['$$this.date', logParams.from] },
                          { $lte: ['$$this.date', logParams.to] }
                        ]
                      }
                    },
                    { case: logParams.to,
                      then: { $lte: ['$$this.date', logParams.to] }
                    },
                    { case: logParams.from,
                      then: { $gte: ['$$this.date', logParams.from] }
                    },
                  ],
                  default: true
                }
              },
            }
          },
        }
      },
      { $project:
        { username: 1,
          log: 
          { $cond: 
            { if: logParams.limit,
              then: { $slice: ['$log', logParams.limit] },
              else: { $slice: ['$log', { $size: '$log' }] }
            }
          }
        }
      },
      { $set: { count: { $size: '$log' } } },
    ]).next();
  },

  makeObjectId: function(str) {
    return new ObjectId(str);
  },
};