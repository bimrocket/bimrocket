/**
 * Bundle.js
 *
 * @author realor
 */

import { Bundle } from "./Bundle.js";

class BundleManager
{
  static _bundles = new Map();

  static getBundles()
  {
    return Array.from(this._bundles.values());
  }

  static setBundle(name, path)
  {
    let bundle = this._bundles.get(name);
    if (bundle === undefined || bundle.path !== path)
    {
      bundle = new Bundle(name, path);
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
}

export { BundleManager };

