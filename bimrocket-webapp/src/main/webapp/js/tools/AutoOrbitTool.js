/*
 * AutoOrbitTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class AutoOrbitTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "auto_orbit";
    this.label = "tool.auto_orbit.label";
    this.help = "tool.auto_orbit.help";
    this.className = "auto_orbit";
    this.setOptions(options);

    this.theta = 0.8;
    this.phi = 0.1;
    this.radius = 30;

    this.minPolarAngle = 0; // radians
    this.maxPolarAngle = Math.PI; // radians

    this.minDistance = 0;
    this.maxDistance = Infinity;

    // internals
    this.vector = new THREE.Vector3();
    this.position = new THREE.Vector3();
    this.center = new THREE.Vector3();
    this.time = 0;
    this._animate = this.animate.bind(this);
  }

  activate()
  {
    const application = this.application;
    var camera = application.camera;
    var container = applicatoion.container;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();

    var matrix = camera.matrix;
    var v = new THREE.Vector3();
    v.x = matrix.elements[8];
    v.y = matrix.elements[9];
    v.z = matrix.elements[10];
    v.normalize();

    this.theta = Math.atan2(v.x, v.y);
    this.phi = Math.acos(v.z);
    this.center.x = camera.position.x - 10 * v.x;
    this.center.y = camera.position.y - 10 * v.y;
    this.center.z = camera.position.z - 10 * v.z;
    this.radius = 10;

    application.addEventListener('animation', this._animate);
  }

  deactivate()
  {
    const application = this.application;
    application.removeEventListener('animation', this._animate);
  }

  animate(event)
  {
    const application = this.application;
    var camera = application.camera;

    var delta = event.delta;
    this.time += delta;

    this.theta += delta * 0.2;
    this.phi = -0.15 + 0.5 * Math.PI + 0.3 *
      Math.sin(0.05 * Math.cos(0.01 * this.time) * this.time);

    // restrict radius
    if (this.radius < this.minDistance) this.radius = this.minDistance;
    else if (this.radius > this.maxDistance) this.radius = this.maxDistance;

    // restrict phi to be between desired limits
    this.phi = Math.max(this.minPolarAngle,
      Math.min(this.maxPolarAngle, this.phi));

    this.vector.x = Math.sin(this.phi) * Math.sin(this.theta);
    this.vector.y = Math.sin(this.phi) * Math.cos(this.theta);
    this.vector.z = Math.cos(this.phi);

    camera.updateMatrixWorld();

    this.position.copy(this.center);
    this.vector.setLength(this.radius);
    this.position.add(this.vector);
    camera.position.copy(this.position);
    camera.updateMatrix();
    camera.lookAt(this.center);
    camera.updateMatrix();

    const changeEvent = {type: "nodeChanged", objects: [camera], source : this};
    application.notifyEventListeners("scene", changeEvent);
  }
}

export { AutoOrbitTool };
