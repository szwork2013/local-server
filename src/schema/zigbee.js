//noinspection JSUnresolvedVariable
const co = require('co');
const expect = require('chai').expect;
const Schema = require('mongoose').Schema;

const ObjectId = Schema.Types.ObjectId;
const config = global.__config;

// device
// ---------------------------------------

const deviceSchema = new Schema({
  nwk: {
    $type: Number,
    required: [true, '网络地址是必须的']
  },
  ieee: {
    $type: String,
    required: true
  },
  type: {
    $type: String,
    required: [true, '设备类型是必须的'],
    enum: ['router', 'endDevice', 'coordinator']
  },
  name: {
    $type: String,
  }
}, {
  timestamps: true,
  toObject: {
    getters: true,
    virtuals: true,
    minimize: false,
    retainKeyOrder: true,
  },
  toJSON: this.toObject,
  strict: true,
  typeKey: '$type',
  minimize: false,
});
deviceSchema.name = 'Device';
deviceSchema.pre('validate', function (next) {
  const { ieee } = this;
  try {
    expect(ieee).to.match(/^([A-Z0-9]{1,2}-){7}[A-Z0-9]{1,2}$/);
  } catch (e) { next(e) }
  next();
});
deviceSchema.query.byNwk = function(nwk) {
  return this.findOne({nwk});
};
deviceSchema.static('joinApps', function (dbQuery={}, cb) {
  const Device = this;
  const App = this.model('App');
  co(function * () {
    const devs = yield Device
      .find(dbQuery)
      .exec();
    let result = devs.map(dev => dev.toObject());
    for(let i=0; i<result.length; i++) {
      let apps = yield App
        .find()
        .where('device').equals(result[i].nwk)
        .exec();
      result[i].apps = apps.map(app => app.toObject());
    }
    return result;
  })
    .then(result => {
      cb(null, result);
    })
    .catch(function (err) {
      cb(err);
    });
});

// app
// ---------------------------------------

const appSchema = new Schema({
  device: {$type: Number, ref: deviceSchema.name },
  endPoint: {
    $type: Number,
    min: 0,
    max: 255
  },
  type: {
    $type: String,
    required: true,
    enum: [
      'unknow',
      // lamp
      'lamp',
      'gray-lamp',
      // switch
      'switch',
      'gray-switch',
      'pulse',
      // sensor
      'illuminance-sensor',
      'temperature-sensor',
      'asr-sensor'
    ]
  },
  payload: {
    $type: Schema.Types.Mixed,
    default: {}
  },
  name: {
    $type: String,
  }
}, {
  timestamps: true,
  toObject: {
    getters: true,
    virtuals: true,
    minimize: false,
    retainKeyOrder: true,
  },
  toJSON: this.toObject,
  strict: true,
  typeKey: '$type',
  minimize: false,
});
appSchema.name = 'App';
// app's validator
appSchema.pre('validate', function(next) {
  const self = this;
  const {endPoint, type, payload} = self;
  if (type=='lamp') {
    try {
      expect(payload).to.have.property('on').that.is.a('boolean');
    } catch(e) { next(e) }
  }
  else if (type=='gray-lamp') {
    try {
      expect(payload).to.have.property('level');
      expect(payload.level).to.be.a('number');
      expect(payload.level).to.be.within(0,100);
    } catch(e) { next(e) }
  }
  else if (type=='switch') {
    try {
      expect(payload).to.have.property('on').that.is.a('boolean')
    } catch (e) { next(e) }
  }
  else if (type=='gray-switch') {
    try {
      expect(payload).to.have.property('level').that.is.a('number');
      expect(payload.level).to.be.within(0,100);
    } catch (e) { next(e) }
  }
  else if (type=='pulse') {
    try {
      expect(payload).to.have.property('transId').that.is.a('number')
    } catch (e) { next(e) }
  }
  else if (type=='illuminance-sensor') {
    try {
      expect(payload).to.have.property('level').that.is.a('number');
      const [low, high] = config['app/illuminance-sensor/range'];
      expect(payload.level).to.be.within(low, high);
    } catch (e) { next(e) }
  }
  else if (type=='temperature-sensor') {
    try {
      expect(payload).to.have.property('temperature').that.is.a('number');
      const [low, high] = config['app/temperature-sensor/range'];
      expect(payload.temperature).to.be.within(low, high);
    } catch (e) { next(e) }
  }
  next();
});
// query helper
appSchema.query.byNwk = function (nwk) {
  return this.find({ device: nwk, });
};
appSchema.query.byNwkEp = function (nwk, ep) {
  return this.findOne({ device: nwk, endPoint: ep});
};

// export
// -----------------

module.exports = {
  [deviceSchema.name]: deviceSchema,
  [appSchema.name]: appSchema
};
