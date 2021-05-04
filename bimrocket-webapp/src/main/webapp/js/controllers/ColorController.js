/*
 * ColorController.js
 *
 * @autor: realor
 */

BIMROCKET.ColorController = class extends BIMROCKET.Controller
{
  static type = "ColorController";
  static description = "Colorize an object.";

  constructor(application, object, name)
  {
    super(application, object, name);
    this.input = this.createProperty("number", "Input value", 0);
    this.minColor = this.createProperty("color", "Min. color", "#808080");
    this.maxColor = this.createProperty("color", "Max. color", "#FFFF00");
    this.minValue = this.createProperty("number", "Min. value", 0);
    this.maxValue = this.createProperty("number", "Max. value", 1);
    this.emissive = this.createProperty("number", "Emissive", 0);
    
    this.material = new THREE.MeshPhongMaterial({
      color: 0xFFFF00, emissive: 0xFFFFFF, emissiveIntensity : 0.0,
      side: THREE.DoubleSide});

    this.materialMap = new Map();    

    this._onNodeChanged = this.onNodeChanged.bind(this);
  }

  onStart()
  {
    this.replaceMaterial();
    this.updateColor(this.input.value, true);
    this.application.addEventListener("scene", this._onNodeChanged);
  }

  onStop()
  {
    this.restoreMaterial();
    this.application.removeEventListener("scene", this._onNodeChanged);
    this.application.notifyObjectUpdated(this.object);
  }

  onNodeChanged(event)
  {
    if (event.type === "nodeChanged" && this.input.isBoundTo(event.object))
    {
      this.updateColor(this.input.value, false);
    }
  }

  updateColor(value, force)
  {
    let color = null;
    let minValue = this.minValue.value;
    let maxValue = this.maxValue.value;
    let minColor = this.minColor.value;
    let maxColor = this.maxColor.value;
    
    let factor;
    if (value <= minValue)
    {
      color = this.parseColor(minColor);
      factor = 0;
    }
    else if (value >= maxValue)
    {
      color = this.parseColor(maxColor);
      factor = 1;
    }
    else // interpolate color
    {
      factor = (value - minValue) / (maxValue - minValue); // [0..1]
      color = this.parseColor(minColor);
      color.lerp(this.parseColor(maxColor), factor);
    }
    
    if (force || this.material.color.getHex() !== color.getHex())
    {
      this.material.color = color;
      this.material.emissiveIntensity = factor * this.emissive.value;
      this.application.notifyObjectUpdated(this.object);
    }
  }

  parseColor(colorString)
  {
    let color = new THREE.Color();
    color.set(colorString);
    return color;
  }
  
  replaceMaterial()
  {
    let material = this.material;
    let materialMap = this.materialMap;
    
    this.object.traverse(function(object)
    {
      if (object instanceof BIMROCKET.Solid)
      {
        materialMap[object] = object.material;
        object.material = material;
      }
    });
  }
  
  restoreMaterial()
  {
    let materialMap = this.materialMap;
    
    this.object.traverse(function(object)
    {
      if (object instanceof BIMROCKET.Solid)
      {
        let oldMaterial = materialMap[object];
        if (oldMaterial)
        {
          object.material = oldMaterial;
        }
      }
    });
    materialMap.clear();
  }
};

BIMROCKET.controllers.push(BIMROCKET.ColorController);