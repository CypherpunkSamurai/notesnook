import Hashes from "jshashes";
const sha256 = new Hashes.SHA256();

const invalidKeys = ["user", "t"];
const validTypes = ["mobile", "web", "node"];
export default class Backup {
  /**
   *
   * @param {import("../api/index.js").default} db
   */
  constructor(db) {
    this._db = db;
  }

  /**
   *
   * @param {"web"|"mobile"|"node"} type
   * @param {boolean} encrypt
   */
  async export(type, encrypt = false) {
    if (!validTypes.some((t) => t === type))
      throw new Error("Invalid type. It must be one of 'mobile' or 'web'.");

    const keys = (await this._db.context.getAllKeys()).filter(
      (key) => !(key in invalidKeys)
    );

    const db = Object.fromEntries(await this._db.context.readMulti(keys));
    db.h = sha256.hex(JSON.stringify(db));

    if (encrypt) {
      const key = await this._db.user.key();
      return JSON.stringify({
        type,
        date: Date.now(),
        data: await this._db.context.encrypt(key, JSON.stringify(db)),
      });
    }

    return JSON.stringify({
      type,
      date: Date.now(),
      data: db,
    });
  }

  /**
   *
   * @param {string} data the backup data
   */
  async import(data) {
    if (!data) return;

    let backup = JSON.parse(data);

    if (!this._validate(backup)) throw new Error("Invalid backup.");

    let db = backup.data;
    //check if we have encrypted data
    if (db.salt && db.iv) {
      const key = await this._db.user.key();
      db = JSON.parse(await this._db.context.decrypt(key, db));
    }

    if (!this._verify(db))
      throw new Error("Backup file has been tempered, aborting...");

    for (let key in db) {
      let value = db[key];
      await this._db.context.write(key, value);
    }
  }

  _validate(backup) {
    return (
      !!backup.date &&
      !!backup.data &&
      !!backup.type &&
      validTypes.some((t) => t === backup.type)
    );
  }

  _verify(db) {
    const hash = db.h;
    delete db.h;
    return hash == sha256.hex(JSON.stringify(db));
  }
}
