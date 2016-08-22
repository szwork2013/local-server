//noinspection JSUnresolvedVariable
const expect = require('chai').expect;
const Schema = require('mongoose').Schema;

const ObjectId = Schema.Types.ObjectId;

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
deviceSchema.query.byNwk = function(nwk) {
  return this.findOne({nwk});
}

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
    enum: ['lamp', 'sensor-light']
  },
  payload: {
    $type: Schema.Types.Mixed,
    default: {}
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
      expect(payload).to.have.property('level');
      expect(payload.level).to.be.a('number');
      expect(payload.level).to.be.within(0,255);
    } catch(e) {
      next(e);
    }
  }
  next();
});

// export
// -----------------

module.exports = {
  [deviceSchema.name]: deviceSchema,
  [appSchema.name]: appSchema
}