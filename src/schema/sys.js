//noinspection JSUnresolvedVariable
const { Schema } = require('mongoose');

const sysStatus = new Schema({
  status: {
    type: Schema.Types.Mixed,
    default: {}
  },
  // 以下弃用
  mode: {
    type: String,
    required: true,
    enum: ['manual', 'staticScene', 'autoScene'],
  },
  scene: Schema.Types.ObjectId,
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
  minimize: false,
});
sysStatus.name = 'SysStatus';
sysStatus.pre('save', function (next) {
  if (typeof sysStatus._saved == 'undefined') { sysStatus._saved = false }
  if (sysStatus._saved) {
    next(new Error('sys status 只能有一个'))
  } else { next() }
});

const sys = new Schema({
  status: {
    type: Schema.Types.Mixed,
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
  minimize: false,
});
sys.name = 'Sys';
sys.pre('save', function (next) {
  if (typeof sys._saved == 'undefined') { sys._saved = false }
  if (sys._saved) {
    next(new Error('sys 只能有一个'))
  } else { next() }
});

module.exports = {
  [sysStatus.name]: sysStatus, // 弃用
  [sys.name]: sys,
};