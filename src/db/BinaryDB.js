const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const MAGIC = Buffer.from('APDB');
const VERSION = 0x01;
const DB_PATH = path.resolve(__dirname, '..', '..', 'data', 'app.db');

class BinaryDB {
  constructor() {
    this.data = {
      applications: {},
      sessions: {},
      schedules: {},
    };
    this._writeTimer = null;
    this._ensureDir();
    this._load();
  }

  _ensureDir() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  _load() {
    if (!fs.existsSync(DB_PATH)) return;
    try {
      const raw = fs.readFileSync(DB_PATH);
      if (raw.length < 9) throw new Error('File too small');
      if (!raw.slice(0, 4).equals(MAGIC)) throw new Error('Invalid magic bytes');
      const dataLen = raw.readUInt32BE(5);
      const compressed = raw.slice(9, 9 + dataLen);
      const json = zlib.gunzipSync(compressed).toString('utf8');
      const parsed = JSON.parse(json);
      this.data = {
        applications: parsed.applications || {},
        sessions: parsed.sessions || {},
        schedules: parsed.schedules || {},
      };
    } catch (e) {
      console.error('[BinaryDB] Load failed — starting fresh:', e.message);
    }
  }

  _save() {
    clearTimeout(this._writeTimer);
    this._writeTimer = setTimeout(() => {
      try {
        const json = Buffer.from(JSON.stringify(this.data), 'utf8');
        const compressed = zlib.gzipSync(json);
        const header = Buffer.alloc(9);
        MAGIC.copy(header, 0);
        header[4] = VERSION;
        header.writeUInt32BE(compressed.length, 5);
        const tmp = DB_PATH + '.tmp';
        fs.writeFileSync(tmp, Buffer.concat([header, compressed]));
        fs.renameSync(tmp, DB_PATH);
      } catch (e) {
        console.error('[BinaryDB] Save failed:', e.message);
      }
    }, 300);
  }

  // --- Applications ---
  setApplication(guildId, data) {
    this.data.applications[String(guildId)] = data;
    this._save();
  }

  getApplication(guildId) {
    return this.data.applications[String(guildId)] || null;
  }

  deleteApplication(guildId) {
    delete this.data.applications[String(guildId)];
    this._save();
  }

  // --- Sessions (active DM Q&A) ---
  setSession(userId, data) {
    this.data.sessions[String(userId)] = data;
    this._save();
  }

  getSession(userId) {
    return this.data.sessions[String(userId)] || null;
  }

  deleteSession(userId) {
    delete this.data.sessions[String(userId)];
    this._save();
  }

  // --- Schedules ---
  setSchedule(guildId, data) {
    this.data.schedules[String(guildId)] = data;
    this._save();
  }

  getSchedule(guildId) {
    return this.data.schedules[String(guildId)] || null;
  }

  deleteSchedule(guildId) {
    delete this.data.schedules[String(guildId)];
    this._save();
  }

  getAllSchedules() {
    return { ...this.data.schedules };
  }
}

module.exports = new BinaryDB();

// : ! Aegis !
// + Discord: itsfizys
// + Community: https://discord.gg/aerox (AeroX Development )
// + for any queries reach out Community or DM me.
