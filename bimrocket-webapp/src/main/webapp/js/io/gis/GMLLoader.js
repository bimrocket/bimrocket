/**
 * GMLLoader.js
 *
 * @author realor
 */

import { GISLoader } from "./GISLoader.js";
import * as THREE from "three";

class GMLLoader extends GISLoader
{
  constructor(manager)
  {
    super(manager, "text/xml; subtype=gml/3.1.1");
  }

  parse(xml)
  {
    let group = new THREE.Group();
    //TODO: parse xml
    return group;
  }
}

export { GMLLoader };
