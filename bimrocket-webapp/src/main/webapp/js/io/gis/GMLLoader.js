/**
 * GMLLoader.js
 *
 * @author realor
 */

import { GISLoader } from "./GISLoader.js";
import * as THREE from "../../lib/three.module.js";

class GMLLoader extends GISLoader
{
  constructor()
  {
    super("text/xml; subtype=gml/3.1.1");
  }

  parse(xml)
  {
    let group = new THREE.Group();
    //TODO: parse xml
    return group;
  }
}

export { GMLLoader };
