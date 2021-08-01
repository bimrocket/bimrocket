/**
 * Bundle.js
 *
 * @author realor
 */

import { ModuleLoader } from "../utils/ModuleLoader.js";

class Bundle
{
  name = null;
  translations = new Map();

  constructor(name, path)
  {
    this.name = name;
    this.path = path;
  }

  load(languages)
  {
    let promises = [];
    for (let language of languages)
    {
      let translations = this.translations.get(language);
      if (translations === undefined)
      {
        let path = this.path;
        if (language.length > 0) path += "_" + language;
        path += ".js";

        let promise = ModuleLoader.load(path);
        promise.then(module =>
        {
          console.info("bundle " + path + " loaded.");
          this.translations.set(language, module.translations);
        }, () =>
        {
          console.info("bundle " + path + " not found.");
          this.translations.set(language, {});
        });
        promises.push(promise);
        this.translations.set(language, promise);
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
      let langTranslations = this.translations.get(language);
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
}

export { Bundle };

