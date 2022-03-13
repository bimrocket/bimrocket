/**
 * ModuleLoader.js
 *
 * @author realor
 */

class ModuleLoader
{
  static load(path)
  {
    let fullPath;
    if (path.startsWith("http:") || path.startsWith("https:"))
    {
      fullPath = path;
    }
    else
    {
      let pathname = window.location.pathname;
      let index = pathname.lastIndexOf("/");
      let basePath = pathname.substring(0, index) + "/js/";

      fullPath = basePath + path;
    }
    return import(fullPath);
  }
}

export { ModuleLoader };


