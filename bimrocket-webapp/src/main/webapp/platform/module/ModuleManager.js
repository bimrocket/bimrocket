/**
 * ModuleManager.js
 *
 * @author realor
 */

import { Module } from "platform/module/Module.js";
import { Environment } from "environment";

const BUILT_IN_MODULES = ["base", "design", "analysis", "bim", "gis", "control"];

class ModuleManager
{
  static EXTERNAL_MODULES_KEY = "bimrocket.externalModules";
  static _modules = new Map();

  static
  {
    for (let path of BUILT_IN_MODULES)
    {
      this.addModule(path);
    }

    const urls = this.loadExternalModuleUrls();
    for (let url of urls)
    {
      this.addModule(url);
    }
  }

  static addModule(path)
  {
    path = this.normalizePath(path);
    let module = this._modules.get(path);
    if (!module)
    {
      module = new Module(path);
      this._modules.set(path, module);
      if (!path.startsWith("modules"))
      {
        let urls = this.loadExternalModuleUrls();
        if (!urls.includes(path))
        {
          urls.push(path);
          this.saveExternalModuleUrls(urls);
        }
      }
    }
    return module;
  }

  static getModule(path)
  {
    path = this.normalizePath(path);
    return this._modules.get(path);
  }

  static removeModule(path)
  {
    path = this.normalizePath(path);
    this._modules.delete(path);

    let urls = this.loadExternalModuleUrls();
    const index = urls.indexOf(path);
    if (index !== -1)
    {
      urls.splice(index, 1);
      this.saveExternalModuleUrls(urls);
    }
  }

  static async listModules()
  {
    return this._modules.values();
  }

  static async activateModules(application)
  {
    const activeModules = application.activeModules;

    if (activeModules.size > 0)
    {
      console.info("Restart application to activate modules.");
      return;
    }

    let modulesPathsToRead = this.getModulePaths(application);
    let modulesMap = new Map(); // modules already read (name => module)

    while (modulesPathsToRead.length > 0)
    {
      // create & read modules
      const promises = modulesPathsToRead.map(async (modulePath) =>
      {
        const module = this.addModule(modulePath);
        try
        {
          await module.read();
          modulesMap.set(module.name, module);
          return module;
        }
        catch (ex)
        {
          console.error(ex);
          return null;
        }
      });

      const modulesReadPass = (await Promise.all(promises))
        .filter(module => module !== null);

      modulesPathsToRead = [];

      for (let module of modulesReadPass)
      {
        if (Array.isArray(module.dependencies))
        {
          for (let modulePath of module.dependencies)
          {
            let depModule = this.addModule(modulePath);
            if (!depModule.isRead())
            {
              if (!modulesPathsToRead.includes(depModule.path))
              {
                modulesPathsToRead.push(depModule.path);
              }
            }
          }
        }
      }
    }

    // sort modules by priority ascending
    const modulesRead = [...modulesMap.values()];
    modulesRead.sort((m1, m2) => m1.priority - m2.priority);

    // module load & activate
    for (let module of modulesRead)
    {
      try
      {
        await module.activate(application);
        console.info(`Module ${module.name} activated.`);
        activeModules.add(module);
      }
      catch (ex)
      {
        console.error(ex);
      }
    }
  }

  static getModulePaths(application)
  {
    let modulePaths;

    const modulesParam = application.params.get("modules");
    if (modulesParam)
    {
      modulePaths = modulesParam.split(",");
    }
    else
    {
      const item = application.setup.getItem("modules");
      if (item)
      {
        modulePaths = item.split(",");
      }
      else
      {
        modulePaths = Environment.MODULES || BUILT_IN_MODULES;
      }
    }
    return modulePaths;
  }

  static normalizePath(path)
  {
    if (path.indexOf("/") === -1) path = "modules/" + path; // built-in module
    else if (path.endsWith("/")) path = path.substring(0, path.length - 1);
    return path;
  }

  static loadExternalModuleUrls()
  {
    const item = window.localStorage.getItem(this.EXTERNAL_MODULES_KEY);
    return item ? item.split(" ") : [];
  }

  static saveExternalModuleUrls(urls)
  {
    window.localStorage.setItem(this.EXTERNAL_MODULES_KEY, urls.join(" "));
  }
}

window.ModuleManager = ModuleManager;

export { ModuleManager };