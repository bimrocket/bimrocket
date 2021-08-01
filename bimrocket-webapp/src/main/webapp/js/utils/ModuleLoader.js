/**
 * ModuleLoader.js
 *
 * @author realor
 */

class ModuleLoader
{
  static load(path)
  {
    let pathname = window.location.pathname;
    let index = pathname.lastIndexOf("/");
    let basePath = pathname.substring(0, index) + "/js/";
    
    return import(basePath + path);
  }
}

export { ModuleLoader };


