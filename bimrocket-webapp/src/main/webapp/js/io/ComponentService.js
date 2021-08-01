/**
 * ComponentService.js
 *
 * @author realor
 */

import { IOService, IOMetadata, IOResult } from "./IOService.js";
import { ServiceManager } from "./ServiceManager.js";
import { ColladaLoader } from "./ColladaLoader.js";
import * as THREE from "../lib/three.module.js";

class ComponentService extends IOService
{
  static components = [
      ["armari", "Armari"],
      ["cadira", "Cadira"],
      ["camaro", "Crysler Camaro"],
      ["pc", "Ordinador personal"],
      ["taula", "Taula"],
      ["water", "Water"]
    ];

  constructor(name, description, url, username, password)
  {
    super(name, description, url, username, password);
  }

  open(path, options, readyCallback, progressCallback)
  {
    const OK = IOResult.OK;
    const COLLECTION = IOMetadata.COLLECTION;
    const OBJECT = IOMetadata.OBJECT;
    let metadata;

    if (path === "/")
    {
      let entries = [];
      let components = this.constructor.components;
      for (let i = 0; i < components.length; i++)
      {
        let component = components[i];
        metadata = new IOMetadata(component[0], component[1], OBJECT);
        entries.push(metadata);
      }
      metadata = new IOMetadata("Components", "Components", COLLECTION);
      readyCallback(new IOResult(OK, "", path, metadata, entries));
    }
    else
    {
      const loader = new ColladaLoader();
      const url = this.url + path + ".dae";
      console.info("Loading url", url);
      loader.load(url, collada =>
      {
        let object = collada.scene;
        let name = path.substring(1);
        object.name = name;
        metadata = new IOMetadata(name, name, OBJECT);
        readyCallback(new IOResult(OK, "", path, metadata, null, object));
      },
      data =>
      {
        let progress = 100 * data.loaded / data.total;
        progressCallback({progress : progress, message : "Loading..."});
      });
    }
  }
}

ServiceManager.addClass(ComponentService);

export { ComponentService };
