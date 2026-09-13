/**
 * BundleManager.js
 *
 * @author realor
 */

class BundleManager
{
  static _bundles = new Map();

  static setBundle(name, source, importMeta)
  {
    let bundle;

    if (typeof source === "string") // source is path
    {
      let path = importMeta ? new URL(source, importMeta.url).href : source;

      bundle = this._bundles.get(name);
      if (bundle === undefined || bundle.path !== path)
      {
        bundle = Bundle.fromPath(name, path);
        this._bundles.set(name, bundle);
      }
    }
    else if (typeof source === "object") // source is { <lang>: { ... } }
    {
      bundle = Bundle.fromObject(name, source);
      this._bundles.set(name, bundle);
    }
    return bundle;
  }

  static getBundle(name)
  {
    return this._bundles.get(name);
  }

  static removeBundle(name)
  {
    return this._bundles.delete(name);
  }

  static getBundles()
  {
    return Array.from(this._bundles.values());
  }
}

class Bundle
{
  _name = null;
  _path = null;
  _translations = new Map();

  static fromPath(name, path)
  {
    const bundle = new Bundle(name);
    bundle._path = path;
    return bundle;
  }

  static fromObject(name, object)
  {
    const bundle = new Bundle(name);
    for (const [key, value] of Object.entries(object))
    {
      bundle._translations.set(key, value);
    }
    return bundle;
  }

  constructor(name)
  {
    this._name = name;
  }

  load(languages)
  {
    let promises = [];
    for (let language of languages)
    {
      let translations = this._translations.get(language);
      if (translations === undefined && this._path)
      {
        let bundleName = this._name;
        let path = this._path;

        if (language)
        {
          bundleName += "_" + language;
          path += "_" + language;
        }
        path += ".js";

        let promise = import(path);
        promise.then(module =>
        {
          const entries = Object.keys(module.translations).length;
          console.info(`Bundle ${bundleName} loaded (${entries} entries).`);
          this._translations.set(language, module.translations);
        }, (error) =>
        {
          console.info(`Bundle ${bundleName} not found.`, error);
          this._translations.set(language, {});
        });
        promises.push(promise);
        this._translations.set(language, promise);
      }
      else if (translations instanceof Promise)
      {
        promises.push(translations);
      }
    }
    return Promise.allSettled(promises);
  }

  get(languages, key, ...args)
  {
    let text = undefined;
    for (let language of languages)
    {
      let langTranslations = this._translations.get(language);
      if (langTranslations)
      {
        text = langTranslations[key];
        if (text)
        {
          if (typeof text === "function")
          {
            text = text(...args);
          }
          break;
        }
      }
    }
    return text || key;
  }

  has(key)
  {
    return Boolean(this._translations.get("")?.[key]);
  }
}

export { BundleManager, Bundle };

