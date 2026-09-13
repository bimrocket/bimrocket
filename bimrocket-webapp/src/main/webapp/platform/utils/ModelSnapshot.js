/**
 * ModelSnapshot.js
 *
 * @author realor
 */

class ModelSnapshot
{
  static SNAPSHOT_VERSION = "1.0";
  static SNAPSHOT_EXTENSION = "snp";
  static decimals = 6;

  static generate(object)
  {
    let globalId = object.userData.IFC?.GlobalId;
    if (!globalId) throw "Object is not an IfcRoot.";

    const snapshot = {
      version : this.SNAPSHOT_VERSION,
      globalId : globalId,
      dateTime : new Date().toISOString(),
      decimals : this.decimals,
      objects : {}
    };

    object.traverse(obj =>
    {
      if (obj.visible)
      {
        let globalId = obj.userData.IFC?.GlobalId;
        if (typeof globalId === "string")
        {
          snapshot.objects[globalId] = this.getObjectData(obj);
        }
      }
    });
    return snapshot;
  }

  static getObjectData(object)
  {
    const objectData = {};

    const userData = object.userData;
    for (let psetName of Object.keys(userData))
    {
      const transform = {
        "position": "(" + this.round(object.position.x) + ", " +
                           this.round(object.position.y) + ", " +
                           this.round(object.position.z) + ")",
        "rotation": "(" + this.round(object.rotation.x) + ", " +
                           this.round(object.rotation.y) + ", " +
                           this.round(object.rotation.z) + ")",
        "scale": "(" + this.round(object.scale.x) + ", " +
                        this.round(object.scale.y) + ", " +
                        this.round(object.scale.z) + ")"
      };
      objectData["transform"] = transform;

      const repr = IFC.getRepresentation(object);
      if (repr)
      {
        objectData["representation"] = this.getRepresentationData(repr);
      }

      if (psetName === "IFC") // Attributes
      {
        const attribs = userData[psetName];
        if (typeof attribs.ifcClassName === "string")
        {
          objectData["IFC"] = {};
          this.copyProperties(attribs, objectData["IFC"]);
        }
      }
      else if (psetName.startsWith("IFC_"))
      {
        const pset = userData[psetName];
        if (pset.ifcClassName === "IfcPropertySet")
        {
          objectData[psetName] = {};
          this.copyProperties(pset, objectData[psetName]);
        }
      }
    }
    return objectData;
  }

  static copyProperties(source, target)
  {
    for (let propName of Object.keys(source))
    {
      let value = source[propName];
      let valueType = typeof value;
      if (valueType === "string" ||
          valueType === "number" ||
          valueType === "boolean")
      {
        target[propName] = value;
      }
    }
  }

  static getRepresentationData(repr)
  {
    const items = repr instanceof Solid ? [repr] : repr.children;

    let area = 0;
    let vertices = 0;
    for (let item of items)
    {
      if (item instanceof Solid)
      {
        const geometry = item.geometry;
        vertices += geometry.vertices.length;
        for (let face of geometry.faces)
        {
          area += face.getArea();
        }
      }
    }
    return {
      items : items.length,
      vertices : vertices,
      area : this.round(area)
    };
  }

  static round(number)
  {
    const k = Math.pow(10, this.decimals);
    return String(Math.round(number * k) / k);
  }
}

export { ModelSnapshot };