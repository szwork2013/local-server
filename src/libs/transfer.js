/**
 * @module
 */

const { Writable } = require('stream');
const { SOF, genFCS, isAreq } = require('../utils/mt');
const { transfer: log } = require('../utils/log');

/**
 * @fires sreq
 * @fires srsp
 * @fires areq
 * @fires frame
 * @see Writable
 */
class Transfer extends Writable {
  constructor(props) {
    super(props);
    this._tempChunk = null;
    // serial data cache
    this._cache = new Buffer(0);
    this._frame = {};
    this._serial = require('./serial');
    this._serial.on('data', this._handleSerialData.bind(this));
    this.on('frame', this._dispatchFrame.bind(this));
  }

  /**
   * 分发frame到srsp和areq
   * @param {Buffer} buf
   * @param {Object} frameObj
   * @private
   */
  _dispatchFrame(buf, frameObj) {
    if (isAreq(buf)) {
      log.trace('dispatch AREQ', buf, '\n', frameObj);
      /**
       * @event areq
       *
       * @type {Buffer}
       * @type {Object}
       * @property {Number} sof - SOF
       * @property {Number} dataLen
       * @property {Number} cmd0
       * @property {Number} cmd1
       * @property {Buffer} data
       * @property {Number} fcs - FCS
       */
      this.emit('areq', buf, frameObj)
    } else {
      log.trace('dispatch SRSP', buf, '\n', frameObj);
      /**
       * @event srsp
       *
       * @type {Buffer}
       * @type {Object}
       * @property {Number} sof - SOF
       * @property {Number} dataLen
       * @property {Number} cmd0
       * @property {Number} cmd1
       * @property {Buffer} data
       * @property {Number} fcs - FCS
       */
      this.emit('srsp', buf, frameObj)
    }
  }
  _handleSerialData(chunk) {
    this._cache = Buffer.concat([this._cache, chunk]);
    // first SOF
    const sofIndex = this._cache.indexOf(SOF);
    if (sofIndex < 0) {
      // clear buf
      this._cache = new Buffer(0);
      return
    }
    this._cache = this._cache.slice(sofIndex);
    this._frame.sof = SOF;
    // cache at least 4 bytes (SOF + LEN + CMD0 + CMD1)
    if (this._cache.length < 4) { return }
    // get LEN
    this._frame.dataLen = this._cache.readUInt8(1);
    // get cmd
    this._frame.cmd0 = this._cache.readUInt8(2);
    this._frame.cmd1 = this._cache.readUInt8(3);
    // cache last dataLen + FCS
    if (this._cache.length < (4 + this._frame.dataLen + 1)) { return }
    // check FCS (LEN -> DATA)
    this._frame.fcs = this._cache.readUInt8(this._cache.length-1);
    if (
      genFCS(this._cache.slice(1, this._cache.length-1)) != this._frame.fcs
    ) { return }
    // copy data
    this._frame.data = new Buffer(this._frame.dataLen);
    this._cache.copy(this._frame.data, 0, 4, 4+this._frame.dataLen);
    log.trace('got frame', this._cache, '\n', this._frame);
    /**
     * @event frame
     *
     * @type {Buffer} - origin frame bytes
     *
     * @type {Object}
     * @property {Number} sof - SOF
     * @property {Number} dataLen
     * @property {Number} cmd0
     * @property {Number} cmd1
     * @property {Buffer} data
     * @property {Number} fcs - FCS
     */
    const parsed = Object.assign({}, this._frame);
    this.emit('frame', Buffer.from(this._cache), parsed );
    // reset
    this._cache = new Buffer(0);
    this._frame = {};
  }
  _write(chunk, encoding, callback) {
    const mtFrame = this._tempChunk;
    this._serial.write(chunk, err => {
      if (err) { callback(err) } else {
        this._serial.drain(err => {
          if (err) { callback(err) } else {
            log.trace('指令帧已写入串口', chunk, '\n', mtFrame);
            callback();
            /**
             * @event sreq
             *
             * @type {Buffer}
             * @type {Frame}
             */
            this.emit('sreq', chunk, mtFrame);
          }
        })
      }
    })
  }
  /**
   * 此处改写`write`方法，以便能接受Frame类型的chunk。
   *
   * 不可信地发送指令帧。当写入串口时，认为发送成功。
   * @param {Frame} chunk
   * @param encoding
   * @param callback
   * @private
   * @callback {Object} callback
   * @see parseSrsp
   * @memberOf Transfer
   */
  write(chunk, encoding, callback) {
    log.trace('收到指令帧，准备写入串口\n', chunk);
    this._tempChunk = chunk;
    super.write(chunk.dump(), encoding, callback);
  }
}


module.exports = new Transfer();
