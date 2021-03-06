import Account from './account';
import localStore from 'store';
import { debounce } from 'lodash';

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
const LS_STORE_KEY = '_parity::localAccounts';

export default class Accounts {
  constructor (data = localStore.get(LS_STORE_KEY) || {}) {
    const {
      last = NULL_ADDRESS,
      store = []
    } = data;

    this.persist = debounce(() => {
      localStore.set(LS_STORE_KEY, this);
    }, 100);

    this._last = last;
    this._store = store.map((data) => new Account(this.persist, data));
  }

  create (secret, password) {
    const privateKey = Buffer.from(secret.slice(2), 'hex');

    return Account
      .fromPrivateKey(this.persist, privateKey, password)
      .then((account) => {
        const { address } = account;

        if (this._store.find((account) => account.address === address)) {
          throw new Error(`Account ${address} already exists!`);
        }

        this._store.push(account);
        this.lastAddress = address;

        this.persist();

        return account.address;
      });
  }

  set lastAddress (value) {
    this._last = value.toLowerCase();
  }

  get lastAddress () {
    return this._last;
  }

  get (address) {
    address = address.toLowerCase();

    this.lastAddress = address;

    const account = this._store.find((account) => account.address === address);

    if (!account) {
      throw new Error(`Account not found: ${address}`);
    }

    return account;
  }

  remove (address, password) {
    address = address.toLowerCase();

    const account = this.get(address);

    if (!account) {
      return false;
    }

    return account
      .isValidPassword(password)
      .then((isValid) => {
        if (!isValid) {
          return false;
        }

        if (address === this.lastAddress) {
          this.lastAddress = NULL_ADDRESS;
        }

        this.removeUnsafe(address);

        return true;
      });
  }

  removeUnsafe (address) {
    address = address.toLowerCase();

    const index = this._store.findIndex((account) => account.address === address);

    if (index === -1) {
      return;
    }

    this._store.splice(index, 1);

    this.persist();
  }

  mapArray (mapper) {
    return this._store.map(mapper);
  }

  mapObject (mapper) {
    const result = {};

    this._store.forEach((account) => {
      result[account.address] = mapper(account);
    });

    return result;
  }

  toJSON () {
    return {
      last: this._last,
      store: this._store
    };
  }
}
