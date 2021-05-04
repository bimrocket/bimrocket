/*
 * LightController.js
 *
 * @autor: realor
 */

BIMROCKET.LightController = class extends BIMROCKET.Controller
{
  static type = "LightController";
  static description = "Lights and object.";

  constructor(application, object, name)
  {
    super(application, object, name);
    this.input = this.createProperty("number", "Input value", 0);
    this.minValue = this.createProperty("number", "Min. value", 0);
    this.maxValue = this.createProperty("number", "Max. value", 1);
    this.intensity = this.createProperty("number", "Intensity", 1);
    this.distance = this.createProperty("number", "Distance", 3);
    this.offsetX = this.createProperty("number", "Offset X", 0);
    this.offsetY = this.createProperty("number", "Offset Y", 0);
    this.offsetZ = this.createProperty("number", "Offset Z", 0);
    
    this._onNodeChanged = this.onNodeChanged.bind(this);
  }

  onStart()
  {
    this.createLight();
    this.update(true);
    this.application.addEventListener("scene", this._onNodeChanged);
  }

  onStop()
  {
    this.destroyLight();
    this.application.removeEventListener("scene", this._onNodeChanged);
  }

  onNodeChanged(event)
  {
    if (event.type === "nodeChanged" && 
        (this.input.isBoundTo(event.object) || this.object === event.object))
    {
      this.update(false);
    }
  }

  update(force)
  {
    let value = this.input.value;
    let distance = this.distance.value;
    let minValue = this.minValue.value;
    let maxValue = this.maxValue.value;
    let offsetX = this.offsetX.value;
    let offsetY = this.offsetY.value;
    let offsetZ = this.offsetZ.value;
    
    let factor;
    if (value <= minValue)
    {
      factor = 0;
    }
    else if (value >= maxValue)
    {
      factor = 1;
    }
    else // interpolate factor
    {
      factor = (value - minValue) / (maxValue - minValue); // [0..1]
    }
    
    let intensity = factor * this.intensity.value;
    if (force ||
         this.light.intensity !== intensity || 
         this.light.distance !== distance ||
         this.light.position.x !== offsetX ||
         this.light.position.y !== offsetY ||
         this.light.position.z !== offsetZ)
    {
      this.light.intensity = intensity;
      this.light.distance = distance;
      this.light.position.set(offsetX, offsetY, offsetZ);
      this.light.updateMatrix();      
      this.application.notifyObjectUpdated(this.object);
    }
  }
  
  createLight()
  {
    this.light = new THREE.PointLight(0xFFFFFF);
    this.light.name = "light"; //BIMROCKET.HIDDEN_PREFIX + "light";
    this.object.add(this.light);
    var addEvent = {type : "added", object : this.light, parent: this.object,
      source : this};
    this.application.notifyEventListeners("scene", addEvent);
  }
  
  destroyLight()
  {
    this.object.remove(this.light);
    var removeEvent = {type : "removed", object : this.light, 
      parent: this.object, source : this};
    this.application.notifyEventListeners("scene", removeEvent);
    this.light = null;
  }
};

BIMROCKET.controllers.push(BIMROCKET.LightController);