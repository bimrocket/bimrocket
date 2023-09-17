/**
 * ObjectUtils.js
 *
 * @author realor
 */

import { Cord } from "../core/Cord.js";
import { Profile } from "../core/Profile.js";
import { Solid } from "../core/Solid.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import * as THREE from "../lib/three.module.js";

class ObjectUtils
{
  static ORIGINAL_MATERIAL = "originalMaterial";

  static HIGHLIGHT_BOX = "box";
  static HIGHLIGHT_EDGES = "edges";
  static HIGHLIGHT_NONE = "none";

  static METER_CONVERSION_FACTORS =
  {
    "km" : 0.001,
    "m"  : 1,
    "cm" : 100,
    "mm" : 1000,
    "in" : 39.3701
  };

  static getObjectValue(object, ...properties)
  {
    if (properties.length === 0) return object;

    let data = object;
    let i = 0;
    while (i < properties.length && data && typeof data === "object")
    {
      let property = properties[i];

      if (data instanceof THREE.Object3D)
      {
        if (typeof property === "string")
        {
          if (property.startsWith("child:"))
          {
            let childName = property.substring(6);
            let children = data.children;
            data = null;
            for (let child of children)
            {
              if (child.name === childName)
              {
                data = child;
                break;
              }
            }
          }
          else if (property.startsWith("descendant:"))
          {
            let descendantName = property.substring(11);
            let children = data.children;
            for (let child of children)
            {
              data = child.getObjectByName(descendantName);
              if (data) break;
            }
          }
          else if (property.startsWith("ancestor:"))
          {
            let ancestorName = property.substring(9);
            let ancestor = data.parent;
            while (ancestor !== null && ancestor.name !== ancestorName)
            {
              ancestor = ancestor.parent;
            }
            data = ancestor;
          }
          else
          {
            let value = data[property];
            data = value === undefined ? data.userData[property] : value;
          }
        }
        else if (typeof property === "number")
        {
          data = data.children[property];
        }
        else
        {
          data = undefined;
        }
      }
      else
      {
        data = data[property];
      }
      i++;
    }
    if (data === null || data === undefined) data = "";

    return data;
  }

  /**
   * Creates a function to evaluate a expression for an object
   *
   * @param {String|Function} expression : an expression with references to
   * $ function. When expression is a String it can also have references to
   * these object properties: object, position, rotation, scale, material,
   * userData, builder and controllers.
   *
   * @returns {Function} : function fn(object) that evaluates expression for
   * the given object.
   *
   * Examples:
   *   ObjectUtils.createEvalFunction('$("IFC", "ifcClassName") === "IfcBeam"')
   *   ObjectUtils.createEvalFunction($ => $("IFC", "Name") === "House")
   *
   */
  static createEvalFunction(expression)
  {
    if (typeof expression === "string")
    {
      let fn = new Function("object", "position", "rotation", "scale",
        "material", "userData", "builder", "controllers", "$",
        "return " + expression + ";");

      return object =>
      {
        const $ = (...properties) =>
          this.getObjectValue(object, ...properties);

        return fn(object, object.position, object.rotation, object.scale,
          object.material, object.userData, object.builder,
          object.controllers, $);
      };
    }
    else if (typeof expression === "function")
    {
      return object =>
      {
        const $ = (...properties) =>
          this.getObjectValue(object, ...properties);

        return expression($);
      };
    }
    else
    {
      return () => expression;
    }
  }

  static dispose(root, geometries = true, materials = true)
  {
    root.traverse(object =>
    {
      if (geometries && object.geometry)
      {
        const geometry = object.geometry;
        if (geometry.dispose)
        {
          geometry.dispose();
        }
      }

      if (materials && object.material)
      {
        this.disposeMaterial(object.material);
      }
    });
  }

  static disposeMaterial(material)
  {
    if (material instanceof THREE.Material)
    {
      material.dispose();
    }
    else if (material instanceof Array)
    {
      for (let mat of material)
      {
        mat.dispose();
      }
    }
  }

  static applyMaterial(object, material, original = true)
  {
    const ORIGINAL_MATERIAL = ObjectUtils.ORIGINAL_MATERIAL;
    let changed = false;

    if (material === null) // restore original material if possible
    {
      if (object[ORIGINAL_MATERIAL])
      {
        this.disposeMaterial(object.material);
        object.material = object[ORIGINAL_MATERIAL];
        object[ORIGINAL_MATERIAL] = null;
        changed = true;
      }
    }
    else if (material instanceof THREE.Material)
    {
      if (original)
      {
        if (object[ORIGINAL_MATERIAL])
        {
          this.disposeMaterial(object[ORIGINAL_MATERIAL]);
          object[ORIGINAL_MATERIAL] = null;
        }
      }
      else
      {
        if (object[ORIGINAL_MATERIAL])
        {
          // original material already saved
        }
        else
        {
          object[ORIGINAL_MATERIAL] = object.material;
        }
      }
      if (object.material !== material)
      {
        this.disposeMaterial(object.material);
        object.material = material;
        changed = true;
      }
    }
    return changed;
  }

  static getObjectClassNames(object)
  {
    let classList = [ object.type ];

    if (object.userData.IFC && object.userData.IFC.ifcClassName)
    {
      classList.push(object.userData.IFC.ifcClassName);
    }
    if (object.builder)
    {
      classList.push(object.builder.constructor.name);
    }
    return classList.join(" ");
  }

  static findObjects(condition, baseObject, nested = false)
  {
    const objects = [];

    function traverse(object)
    {
      let accepted = condition(object);

      if (accepted)
      {
        objects.push(object);
      }

      if (!accepted || nested)
      {
        if (!(object instanceof Solid))
        {
          const children = object.children;
          for (let child of children)
          {
            traverse(child);
          }
        }
      }
    }

    traverse(baseObject);

    return objects;
  }

  static updateVisibility(objects, visible)
  {
    return this.updateAppearance(objects, { visible : visible });
  }

  static updateStyle(objects, edgesVisible = true, facesVisible = true)
  {
    return this.updateAppearance(objects,
    { edgesVisible : edgesVisible, facesVisible : facesVisible });
  }

  static updateAppearance(objects, appearance)
  {
    const visited = appearance.visible ? new Set() : null;

    const setupMaterial = (property, materialClass) =>
    {
      let material = appearance[property];

      if (material instanceof THREE.Material || material === null)
        return material;

      if (typeof material === "object")
      {
        return new materialClass(material);
      }
      return undefined;
    };

    let meshMaterial = setupMaterial("meshMaterial", THREE.MeshPhongMaterial);
    let lineMaterial = setupMaterial("lineMaterial", THREE.LineBasicMaterial);
    let pointsMaterial = setupMaterial("pointsMaterial", THREE.PointsMaterial);

    return ObjectUtils.updateObjects(objects, (object, changed) =>
    {
      if (appearance.visible !== undefined)
      {
        if (object.visible !== appearance.visible)
        {
          object.visible = appearance.visible;
          changed.add(object);

          if (object.visible)
          {
            // make ancestors visible
            let ancestor = object.parent;
            while (ancestor !== null && !visited.has(ancestor))
            {
              if (ancestor.visible === false)
              {
                ancestor.visible = true;
                changed.add(ancestor);
              }
              visited.add(ancestor);
              ancestor = ancestor.parent;
            }
          }
        }
      }

      const original = appearance.original === true;

      if (object instanceof THREE.Mesh)
      {
        if (ObjectUtils.applyMaterial(object, meshMaterial, original))
        {
          changed.add(object);
        }
      }
      else if (object instanceof THREE.Line)
      {
        if (ObjectUtils.applyMaterial(object, lineMaterial, original))
        {
          changed.add(object);
        }
      }
      else if (object instanceof THREE.Points)
      {
        if (ObjectUtils.applyMaterial(object, pointsMaterial, original))
        {
          changed.add(object);
        }
      }
      else if (object instanceof Solid)
      {
        if (appearance.facesVisible !== undefined)
        {
          if (object.facesVisible !== appearance.facesVisible)
          {
            object.facesVisible = appearance.facesVisible;
            changed.add(object);
          }
        }

        if (appearance.edgesVisible !== undefined)
        {
          if (object.edgesVisible !== appearance.edgesVisible)
          {
            object.edgesVisible = appearance.edgesVisible;
            changed.add(object);
          }
        }

        if (ObjectUtils.applyMaterial(object.facesObject,
            meshMaterial, original))
        {
          changed.add(object);
        }

        if (ObjectUtils.applyMaterial(object.edgesObject,
            lineMaterial, original))
        {
          changed.add(object);
        }
      }
      else if (object instanceof Profile)
      {
        if (ObjectUtils.applyMaterial(object, lineMaterial, original))
        {
          changed.add(object);
        }
      }
      else if (object instanceof Cord)
      {
        if (ObjectUtils.applyMaterial(object, lineMaterial, original))
        {
          changed.add(object);
        }
      }
    }, true);
  }

  static updateObjects(objects, updateFunction, recursive = false)
  {
    const changed = new Set();

    if (objects instanceof THREE.Object3D)
    {
      objects = [objects];
    }

    function traverse(object)
    {
      updateFunction(object, changed);

      if (!(object instanceof Solid)
          && !(object instanceof Profile)
          && !(object instanceof Cord)
          && !(object instanceof THREE.Mesh)
          && !(object instanceof THREE.Line)
          && !(object instanceof THREE.Points))
      {
        const children = object.children;
        for (let child of children)
        {
          traverse(child);
        }
      }
    }

    if (recursive)
    {
      for (let object of objects)
      {
        traverse(object);
      }
    }
    else
    {
      for (let object of objects)
      {
        updateFunction(object, changed);
      }
    }
    return changed;
  }

  static zoomAll(camera, objects, aspect, includeInvisible, offsetFactor = 1.1)
  {
    if (objects instanceof THREE.Object3D)
    {
      objects = [objects];
    }

    let box = ObjectUtils.getBoundingBoxFromView(
      objects, camera.matrixWorld, includeInvisible); // box in camera CS

    if (box.isEmpty()) return;

    let center = new THREE.Vector3();
    center = box.getCenter(center); // center in camera CS
    let matrix = camera.matrix;
    center.applyMatrix4(matrix); // center in camera parent CS

    let boxWidth = box.max.x - box.min.x;
    let boxHeight = box.max.y - box.min.y;
    let boxDepth = box.max.z - box.min.z;

    let offset;
    if (camera instanceof THREE.PerspectiveCamera)
    {
      let ymax = camera.near * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
  		let xmax = ymax * camera.aspect;

      let yoffset = 0.5 * offsetFactor * boxHeight * camera.near / ymax;
      let xoffset = 0.5 * offsetFactor * boxWidth * camera.near / xmax;

      offset = Math.max(xoffset, yoffset) + 0.5 * boxDepth;

      const requiredFar = offset + 0.5 * boxDepth;

      camera.far = requiredFar < 4000 ? 4000 : requiredFar;
    }
    else // Ortho camera
    {
      let factor = 0.5 * offsetFactor;
      camera.left = -factor * boxWidth;
      camera.right = factor * boxWidth;
      camera.top = factor * boxHeight;
      camera.bottom = -factor * boxHeight;

      offset = 0.5 * camera.far;
    }
    let v = new THREE.Vector3();
    v.setFromMatrixColumn(matrix, 2); // view vector (zaxis) in parent CS
    v.normalize();
    v.multiplyScalar(offset);
    center.add(v);

    camera.zoom = 1;
    camera.position.copy(center);
    camera.updateMatrix();
    this.updateCameraAspectRatio(camera, aspect);
  }

  static updateCameraAspectRatio(camera, aspect)
  {
    if (camera instanceof THREE.PerspectiveCamera)
    {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    else if (camera instanceof THREE.OrthographicCamera)
    {
      var width = camera.right - camera.left;
      var height = camera.top - camera.bottom;
      var currentAspect = width / height;
      if (aspect < currentAspect)
      {
        var h = 0.5 * (width / aspect - height);
        camera.top += h;
        camera.bottom -= h;
      }
      else
      {
        var w = 0.5 * (height * aspect - width);
        camera.left -= w;
        camera.right += w;
      }
      camera.updateProjectionMatrix();
    }
  }

  static getBoundingBox(objects, includeInvisible)
  {
    return this.getBoundingBoxFromView(objects, null, includeInvisible);
  }

  static getBoundingBoxFromView(objects, viewMatrixWorld = null,
    includeInvisible = false)
  {
    const box = new THREE.Box3(); // empty box
    const vertex = new THREE.Vector3();
    let inverseMatrix = null;

    if (viewMatrixWorld instanceof THREE.Matrix4)
    {
      inverseMatrix = new THREE.Matrix4();
      inverseMatrix.copy(viewMatrixWorld).invert();
    }

    function extendBox(object)
    {
      let geometry = object.geometry;

      if (geometry)
      {
        if (geometry instanceof SolidGeometry)
        {
          let vertices = geometry.vertices;
          for (let j = 0; j < vertices.length; j++)
          {
            vertex.copy(vertices[j]);
            vertex.applyMatrix4(object.matrixWorld); // world CS
            if (inverseMatrix) vertex.applyMatrix4(inverseMatrix); // view CS
            box.expandByPoint(vertex);
          }
        }
        else if (geometry instanceof THREE.BufferGeometry)
        {
          let position = geometry.attributes.position;
          if (position)
          {
            const positions = position.array;
            for (let j = 0; j < positions.length; j += 3)
            {
              vertex.set(positions[j], positions[j + 1], positions[j + 2]);
              vertex.applyMatrix4(object.matrixWorld); // world CS
              if (inverseMatrix) vertex.applyMatrix4(inverseMatrix); // view CS
              box.expandByPoint(vertex);
            }
          }
        }
      }
    };

    function traverse(object)
    {
      if (object.visible || includeInvisible)
      {
        if (object instanceof Solid)
        {
          if (object.facesVisible || object.edgesVisible || includeInvisible)
          {
            extendBox(object);
          }
        }
        else if (object instanceof Cord || object instanceof Profile)
        {
          extendBox(object);
        }
        else
        {
          extendBox(object);

          for (let child of object.children)
          {
            traverse(child);
          }
        }
      }
    };

    if (objects instanceof THREE.Object3D)
    {
      traverse(objects);
    }
    else if (objects instanceof Array)
    {
      for (let object of objects)
      {
        traverse(object);
      }
    }
    return box;
  }

  static getLocalBoundingBox(object, all = false)
  {
    const box = new THREE.Box3(); // empty box
    const objectBox = new THREE.Box3();

    function extendBox(object, toBaseMatrix)
    {
      if (object.visible || all)
      {
        let geometry = object.geometry;

        if (geometry)
        {
          if (geometry.boundingBox === null)
          {
            geometry.computeBoundingBox();
          }
          if (!geometry.boundingBox.isEmpty())
          {
            objectBox.copy(geometry.boundingBox);
            objectBox.applyMatrix4(toBaseMatrix);
            box.union(objectBox);
          }
        }

        if (!(object instanceof Solid))
        {
          const children = object.children;
          for (let child of children)
          {
            const matrix = new THREE.Matrix4();
            matrix.copy(toBaseMatrix).multiply(child.matrix);
            extendBox(child, matrix);
          }
        }
      }
    };

    extendBox(object, new THREE.Matrix4());

    return box;
  }

  static getBoxGeometry(box)
  {
    var size = new THREE.Vector3();
    box.getSize(size);

    var points = [];

    var xmin = box.min.x;
    var ymin = box.min.y;
    var zmin = box.min.z;

    var xmax = box.max.x;
    var ymax = box.max.y;
    var zmax = box.max.z;

    var b0 = box.min;
    var b1 = new THREE.Vector3(xmax, ymin, zmin);
    var b2 = new THREE.Vector3(xmax, ymax, zmin);
    var b3 = new THREE.Vector3(xmin, ymax, zmin);

    var t0 = new THREE.Vector3(xmin, ymin, zmax);
    var t1 = new THREE.Vector3(xmax, ymin, zmax);
    var t2 = box.max;
    var t3 = new THREE.Vector3(xmin, ymax, zmax);

    points.push(b0);
    points.push(b1);
    points.push(b1);
    points.push(b2);
    points.push(b2);
    points.push(b3);
    points.push(b3);
    points.push(b0);

    points.push(t0);
    points.push(t1);
    points.push(t1);
    points.push(t2);
    points.push(t2);
    points.push(t3);
    points.push(t3);
    points.push(t0);

    points.push(b0);
    points.push(t0);
    points.push(b1);
    points.push(t1);
    points.push(b2);
    points.push(t2);
    points.push(b3);
    points.push(t3);

    return new THREE.BufferGeometry().setFromPoints(points);
  }

  static findCameras(object, array)
  {
    if (array === undefined) array = [];
    if (object instanceof THREE.Camera)
    {
      array.push(object);
    }
    const children = object.children;
    for (let i = 0; i < children.length; i++)
    {
      this.findCameras(children[i], array);
    }
    return array;
  }

  static findMaterials(object, array)
  {
    if (array === undefined) array = [];
    let materialMap = new Map();

    object.traverse(obj =>
    {
      let material = obj.material;
      if (material)
      {
        if (!materialMap.has(material.uuid))
        {
          materialMap.set(material.uuid, material);
          array.push(material);
        }
      }
    });
    return array;
  }

  static setChildAtIndex(object, index, child)
  {
    if (child.parent === object)
      throw "Can't add object to its current parent.";

    let previousChild = object.children[index];
    previousChild.parent = null;

    child.removeFromParent();

    object.children[index] = child;
    child.parent = object;
  }

  static isObjectDescendantOf(object, parent)
  {
    object = object.parent;
    while (object !== null && object !== parent)
    {
      object = object.parent;
    }
    return object === parent;
  }

  static setSelectionEnabled(object, value)
  {
    this.getSelectionOptions(object, true).enabled = value;
  }

  static getSelectionEnabled(object)
  {
    return this.getSelectionOptions(object)?.enabled;
  }

  static setSelectionGroup(object, value /* boolean || undefined */)
  {
    this.getSelectionOptions(object, true).group = value;
  }

  static getSelectionGroup(object)
  {
    return this.getSelectionOptions(object)?.group;
  }

  static setSelectionHighlight(object, value)
  {
    this.getSelectionOptions(object, true).highlight = value;
  }

  static getSelectionHighlight(object)
  {
    const options = this.getSelectionOptions(object);
    return options?.highlight || options?.type;
  }

  static getSelectionOptions(object, create = false)
  {
    let options = object.userData.selection;
    if (typeof options !== "object" && create)
    {
      options = {};
      object.userData.selection = options;
    }
    return options;
  }

  static isExportable(object)
  {
    if (object.name && object.name.startsWith(THREE.Object3D.HIDDEN_PREFIX))
      return false; // hidden object

    const exportInfo = object.userData.export;
    if (exportInfo)
    {
      if (exportInfo.export === false) // marked as non exportable
      {
        return false;
      }
    }
    return true;
  }

  static isExportableChildren(object)
  {
    const exportInfo = object.userData.export;
    if (exportInfo)
    {
      if (exportInfo.exportChildren === false) // children non exportable
      {
        return false;
      }
    }
    return true;
  }

  static scaleModel(model, toUnits = "m", fromUnits)
  {
    fromUnits = fromUnits || model.userData.units;
    if (fromUnits)
    {
      let factor1 = this.METER_CONVERSION_FACTORS[toUnits];
      let factor2 = this.METER_CONVERSION_FACTORS[fromUnits];

      if (factor1 !== undefined && factor2 !== undefined)
      {
        let scale = factor1 / factor2;
        model.scale.set(scale, scale, scale);
        model.updateMatrix();
        return true;
      }
    }
    return false;
  }
};

export { ObjectUtils };