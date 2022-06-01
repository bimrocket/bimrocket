/**
 * Localizer.js
 *
 * @author realor
 */

import { Bundle } from "./Bundle.js";
import { BundleManager } from "./BundleManager.js";

class I18N
{
  static SEPARATOR = "|";

  _userLanguages = [];
  _requestedLanguages = null;
  _supportedLanguages = new Set();
  defaultBundle = BundleManager.getBundle("base");

  constructor()
  {
  }

  static set(element, property, key, ...args)
  {
    if (element.i18n === undefined)
    {
      element.i18n = {};
    }
    element.i18n[property] =
    {
      "key" : key,
      "args" : args
    };
    element[property] = key;
  }

  addSupportedLanguages(...languages)
  {
    for (let language of languages)
    {
      this._supportedLanguages.add(language);
    }
    this._requestedLanguages = null;
  }

  get supportedLanguages()
  {
    return Array.from(this._supportedLanguages);
  }

  get userLanguages()
  {
    return this._userLanguages;
  }

  set userLanguages(languages)
  {
    if (typeof languages === "string")
    {
      this._userLanguages = [languages];
      this._requestedLanguages = null;
    }
    else if (languages instanceof Array)
    {
      this._userLanguages = languages;
      this._requestedLanguages = null;
    }
  }

  get requestedLanguages()
  {
    if (this._requestedLanguages === null)
    {
      let set = new Set();
      this.userLanguages.forEach(language =>
      {
        if (this._supportedLanguages.has(language))
        {
          set.add(language);
        }
        let parts = language.split("-");
        if (parts.length > 1)
        {
          if (this._supportedLanguages.has(parts[0]))
          {
            set.add(parts[0]);
          }
        }
      });
      set.add(""); // default language
      this._requestedLanguages = Array.from(set);
    }
    return this._requestedLanguages;
  }

  get(key, ...args)
  {
    if (typeof key !== "string") return "";

    let bundle = null;
    let index = key.indexOf(I18N.SEPARATOR);
    if (index === -1)
    {
      bundle = this.defaultBundle;
    }
    else
    {
      bundle = BundleManager.getBundle(key.substring(0, index));
      key = key.substring(index + 1);
    }
    return bundle ? bundle.get(this.requestedLanguages, key, ...args) : key;
  }

  updateTree(rootElement)
  {
    const promises = [];
    const bundles = BundleManager.getBundles();
    bundles.forEach(bundle =>
    {
      let promise = bundle.load(this.requestedLanguages);
      promises.push(promise);
    });

    Promise.allSettled(promises).finally(() =>
    {
      const elements = rootElement.getElementsByTagName("*");
      for (let element of elements)
      {
        this.update(element);
      }
    });
  }

  update(element)
  {
    if (element.i18n)
    {
      for (let property in element.i18n)
      {
        let def = element.i18n[property];
        element[property] = this.get(def.key, ...def.args);
      }
    }
  }
}

export { I18N };