/**
 * Module.js
 *
 * @author realor
 */

import { BundleManager } from "platform/i18n/BundleManager.js";
import * as THREE from "three";

class Module
{
  static METADATA_FILE = "metadata.json";
  static MODULE_FILE = "module.js";

  static CREATED = 0;
  static READ = 1;
  static LOADED = 2;
  static ACTIVATED = 3;

  constructor(path)
  {
    this._path = path; // normalized path
    this._state = Module.CREATED;
    this._dependencies = [];
    this._activate = null;
    this._deactivate = null;
    this._name = null;
    this._version = null;
    this._priority = 1000;
    this._id = THREE.MathUtils.generateUUID();
    this._error = null;
  }

  get path()
  {
    return this._path;
  }

  get id()
  {
    return this._id;
  }

  get name()
  {
    if (this._name) return this._name;

    const path = this.path;
    const index = path.lastIndexOf("/");
    return index === -1 ? path : path.substring(index + 1);
  }

  get version()
  {
    return this._version ? this._version : "?";
  }

  get dependencies()
  {
    return this._dependencies;
  }

  get releaseDate()
  {
    return this._releaseDate;
  }

  get priority()
  {
    return this._priority;
  }

  get license()
  {
    return this._license;
  }

  get error()
  {
    return this._error;
  }

  isRead()
  {
    return this._state !== Module.CREATED;
  }

  getValueKey(property)
  {
    return this._id + "|" + property;
  }

  isValueDefined(property)
  {
    const bundle = BundleManager.getBundle(this._id);
    if (!bundle) return false;

    return bundle.has(property);
  }

  isExternal()
  {
    return !this._path.startsWith("modules");
  }

  clear()
  {
    this._state = Module.CREATED;
    this._name = null;
    this._version = null;
    this._priority = null;
  }

  async read()
  {
    if (this._state === Module.CREATED)
    {
      try
      {
        const response = await fetch(this._path + "/" + Module.METADATA_FILE);
        if (!response.ok)
        {
          throw `HTTP error ${response.status}`;
        }
        const metadata = await response.json();

        if (!metadata?.name) throw "Undefined name property";
        if (!metadata?.version) throw "Undefined version property";

        this._name = metadata.name;
        this._version = metadata.version;
        this._releaseDate = metadata.releaseDate || null;
        this._license = metadata.license || null;
        this._priority = metadata.priority === undefined ?
          1000 : metadata.priority;
        this._error = null;
        if (Array.isArray(metadata.dependencies))
        {
          this._dependencies = metadata.dependencies
            .filter(dep => typeof dep === "string");
        }

        const translations = metadata.translations;
        if (translations)
        {
          BundleManager.setBundle(this._id, translations);
        }
      }
      catch (ex)
      {
        this._error = String(ex);
        throw new Error(`Error reading module ${this.path}`, { cause: ex });
      }
      finally
      {
        this._state = Module.READ;
      }
    }
    return this;
  }

  async load()
  {
    if (this._state < Module.READ)
    {
      await this.read();
    }

    if (this._state === Module.READ)
    {
      try
      {
        const module = await import(this._path + "/" + Module.MODULE_FILE);
        this._activate = module.activate;
        this._deactivate = module.deactivate;
        this._state = Module.LOADED;
      }
      catch (ex)
      {
        throw new Error(`Error loading module ${this.path}`, { cause: ex });
      }
    }
    return this;
  }

  async activate(application)
  {
    if (this._state < Module.LOADED)
    {
      await this.load();
    }

    if (this._state === Module.LOADED)
    {
      try
      {
        await this._activate?.(application);
        this._state = Module.ACTIVATED;
      }
      catch (ex)
      {
        throw new Error(`Error activating module ${this.path}`, { cause: ex });
      }
    }
    return this;
  }

  deactivate(application)
  {
    if (this._state === Module.ACTIVATED)
    {
      try
      {
        this._deactivate?.(application);
        this._state = Module.LOADED;
      }
      catch (ex)
      {
        throw new Error(`Error deactivating module ${this.path}`, { cause: ex });
      }
    }
    return this;
  }
}

export { Module };