/**
 * ModuleLoader.js
 *
 * @author realor
 */

class ModuleLoader
{
  static load(path)
  {
    let fullPath = this.isAbsolutePath(path) ? path : this.getBasePath() + path;

    if (fullPath.indexOf(".") === -1) fullPath += ".js";

    return import(fullPath);
  }

  static getBasePath()
  {
    let pathname = window.location.pathname;
    let index = pathname.lastIndexOf("/");
    return pathname.substring(0, index) + "/js/";
  }

  static isAbsolutePath(path)
  {
    return path.startsWith("http:")
      || path.startsWith("https:")
      || path.startsWith("/");
  }
}

export { ModuleLoader };


