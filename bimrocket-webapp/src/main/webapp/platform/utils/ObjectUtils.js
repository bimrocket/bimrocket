/**
 * ObjectUtils.js
 *
 * @author realor
 */

import { Cord } from "platform/core/Cord.js";
import { Profile } from "platform/core/Profile.js";
import { Solid } from "platform/core/Solid.js";
import { SolidGeometry } from "platform/core/SolidGeometry.js";
import { CSS2DObject } from "platform/renderers/CSS2DRenderer.js";
import * as THREE from "three";

class ObjectUtils
{
  static ORIGINAL_MATERIAL = "originalMaterial";

  static HIGHLIGHT_BOX = "box";
  static HIGHLIGHT_EDGES = "edges";
  static HIGHLIGHT_NONE = "none";

  static METER_CONVERSION_FACTORS =
  {
    "km": 0.001,
    "m"  : 1,
    "cm": 100,
    "mm": 1000,
    "in": 39.3701,
    "ft": 3.28084,
    "yd": 1.09361,
    "mi": 0.000621371
  };

  /**
   * Indicates whether the given value is a string, number or boolean.
   *
   * @param {any} value - the value to test
   * @returns {boolean} true only if the given value is a string, number,
   *   or boolean
   */
  static isBasicType(value)
  {
    let type = typeof value;
    return type === "string" || type === "number" || type === "boolean";
  }

  /**
   * Indicates whether the given array only contains basic types:
   *   string, number, or boolean.
   *
   * @param {Array} array - the array to test
   * @returns {boolean} true only if all elements of the given array are of
   *   basic types
   */
  static isBasicArray(array)
  {
    if (array instanceof Array)
    {
      for (let i = 0; i < array.length; i++)
      {
        if (!this.isBasicType(array[i])) return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Returns the value of an object property specified via a path.
   *
   * @param {any} object - the object to evaluate
   * @param {any} path - elements that represents the path to the property.
   *   Each path element can be one of the following:
   *   - "[name]": gets the value of the object property with that name
   *   - [index]: gets the object value at index position
   *   - "child:[name]": gets the first child object with the given name
   *   - "descendant:[name]": gets the first descendant object with the given name
   *   - "ancestor:[name]": gets the closest ancestor object with the given name
   * @returns {any} the value of the specified property of an empty string
   *   if its value is null or undefined
   *
   * @example
   *   ObjectUtils.getObjectValue(solid, "position", "x")
   *   ObjectUtils.getObjectValue(window, "IFC", "OverallWidth")
   *   ObjectUtils.getObjectValue(wall, "ancestor:IfcWall", "descendant:A12")
   */
  static getObjectValue(object, ...path)
  {
    if (path.length === 0) return object;

    let data = object;
    let i = 0;
    while (i < path.length && data && typeof data === "object")
    {
      let property = path[i];

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
   * Creates a function to evaluate an object expression.
   *
   * @param {string|Function} expression - an expression with references to
   *   $ function. When expression is a String it can also have references to
   *   these object properties: object, position, rotation, scale, material,
   *   userData, builder and controllers
   * @returns {Function} - function fn(object) that evaluates expression for
   *   the given object
   *
   * @example
   *   ObjectUtils.createEvalFunction('$("IFC", "ifcClassName") === "IfcBeam"')
   *   ObjectUtils.createEvalFunction('position.x > 0')
   *   ObjectUtils.createEvalFunction($ => $("IFC", "Name") === "House")
   *
   */
  static createEvalFunction(expression)
  {
    if (typeof expression === "string")
    {
      let fn = new Function("object", "position", "rotation", "scale",
        "material", "userData", "builder", "controllers", "links", "$",
        "return " + expression + ";");

      return object =>
      {
        const $ = (...properties) =>
          this.getObjectValue(object, ...properties);

        return fn(object, object.position, object.rotation, object.scale,
          object.material, object.userData, object.builder,
          object.controllers, object.links, $);
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

  /**
   * Disposes object resources recursivelly.
   *
   * @param {THREE.Object3D} root - the root object
   * @param {boolean} geometries - indicates whether the geometries should be
   *   disposed
   * @param {boolean} materials - indicates whether the materials should be
   *   disposed
   */
  static dispose(root, geometries = true, materials = true)
  {
    const cssObjects = [];

    root.traverse(object =>
    {
      if (object instanceof CSS2DObject)
      {
        cssObjects.push(object);
      }
      else
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
      }
    });

    for (let cssObject of cssObjects)
    {
      cssObject.removeFromParent();
    }
  }

  /**
   * Disposes the object materials.
   *
   * @param {THREE.Material|THREE.Material[]} material - materials to dispose
   */
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

  /**
   * Applies a material to an object.
   *
   * @param {THREE.Object3D} object - the object to apply the material
   * @param {THREE.Material} material - the material to apply. When material
   *   is null, the original material of the object is restored
   * @param {boolean} original - indicates whether the material to apply is
   *   original (true) or temporary (false). When original is false,
   *   the original material is saved so that it can be restored later
   * @returns {boolean} true only when the object material has changed
   */
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

  /**
   * Returns a string containing the object class names (from IFC and builder).
   *
   * @param {THREE.Object3D} object - the object from which to obtain the
   *  class names
   * @returns {String} a string containing the class names separated by spaces
   */
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

  /**
   * Finds the objects that meet the specified condition.
   *
   * @param {function(THREE.Object3D): boolean} condition - the function that
   *   returns true when an object meets the condition
   * @param {THREE.Object3D} baseObject - the base object to start the
   *   search from
   * @param {boolean} nested - when true it also searches for child objects
   *   of the objects that meet the condition
   * @returns {THREE.Object3D[]} an array containing all the objects that meet
   *   the condition
   */
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

  /**
   * Updates the appearance of the given objects.
   *
   * @param {THREE.Object3D[]} objects - the objects whose appearance is to be
   *   changed
   * @param {Object} appearance - an object describing the appearance to apply
   * @param {boolean} appearance.visible - the object visible property
   * @param {boolean} appearance.facesVisible - the Solid facesVisible property
   * @param {boolean} appearance.edgesVisible - the Solid edgesVisible property
   * @param {boolean} appearance.original - changes the original material
   * @param {THREE.Material} appearance.meshMaterial - the mesh material
   * @param {THREE.Material} appearance.lineMaterial - the line material
   * @param {THREE.Material} appearance.pointMaterial - the point material
   */
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
          // visibility change
          if (this.isHidden(object, true) && appearance.visible)
          {
            // do not show hidden objects
          }
          else
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

  /**
   * Applies an update function to the given objects.
   *
   * @param {THREE.Object3D[]} objects - the objects to update
   * @param {function(THREE.Object3D, Set):void} updateFunction - the update
   *   function to apply to the objects
   * @param {boolean} recursive - indicates whether the update is applied
   *   recursivelly
   * @returns {Set<THREE.Object3D>} a set containing the updated objects
   */
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

  /**
   * Applies an offset to the base object to reduce the mantissa of
   * the object coordinates in WCS.
   * The offset is no applied if it is lower than 10000.
   *
   * @param {THREE.Object3D} baseObject - the object to apply the offset
   * @returns {boolean} true when the offset is applied
   */
  static reduceCoordinates(baseObject)
  {
    const box = ObjectUtils.getLocalBoundingBox(baseObject);
    if (box.isEmpty()) return false;

    const center = new THREE.Vector3();
    box.getCenter(center);

    const delta = new THREE.Vector3();
    const offset = delta.addVectors(center, baseObject.position).length();

    // only reduce coordinates if offset > 10000
    if (offset > 10000)
    {
      center.negate();
      baseObject.position.copy(center);
      baseObject.updateMatrix();
    }
    baseObject.updateMatrixWorld(true);

    return true;
  }

  /**
   * Change the camera parameters to fit the given objects on the screen.
   *
   * @param {THREE.Camera} camera - the camera to modify
   * @param {THREE.Object3D[]} objects - the objects to fit on the screen
   * @param {number} aspect - the screen aspect ratio
   * @param {boolean} includeInvisible - indicates whether invisible objects
   *   are included
   * @param {number} offsetFactor - factor to enlarge the objects framing
   */
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

  /**
   * Updates the camera aspect ratio.
   *
   * @param {THREE.Camera} camera - the camera to update the aspect ratio
   * @param {number} aspect - the aspect ratio
   */
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
  
  /**
   * Calculates the distance between the camera and the center of the scene.
   *
   * @param {THREE.Camera} camera - the camera (perspective or orthographic)
   * @param {THREE.Object3D} scene - the scene or group of objects
   * @returns {number} the distance between the camera and the scene
   */
  static distanceByBounds(camera, scene)
  {
    const box = this.getBoundingBox(scene);
    if (box.isEmpty()) return 10;

    const dir = camera.getWorldDirection(new THREE.Vector3());
    const d = box.getCenter(new THREE.Vector3()).sub(camera.position).dot(dir);
    return Math.max(d, camera.near);
  }

  /**
   * Copies the parameters from a perspective camera to an orthographic one.
   *
   * @param {THREE.PerspectiveCamera} persp - the perspective camera
   * @param {THREE.OrthographicCamera} ortho - the orthographic camera
   * @param {number} distance - the distance to the scene
   */
  static copyPerspectiveToOrthographic(persp, ortho, distance = 10)
  {
    persp.updateMatrixWorld(true);

    ortho.position.copy(persp.position);
    ortho.quaternion.copy(persp.quaternion);
    ortho.up.copy(persp.up);

    const height = 2 * distance *
      Math.tan(THREE.MathUtils.degToRad(persp.fov) / 2) / persp.zoom;
    const width = height * persp.aspect;

    ortho.left = -width / 2;
    ortho.right = width / 2;
    ortho.top = height / 2;
    ortho.bottom = -height / 2;
    ortho.zoom = 1;
    ortho.near = persp.near;
    ortho.far = persp.far;

    ortho.updateMatrix();
    ortho.updateProjectionMatrix();
    ortho.updateMatrixWorld(true);
  }

  /**
   * Copies the parameters from an orthographic camera to a perspective one.
   *
   * @param {THREE.OrthographicCamera} ortho - the orthographic camera
   * @param {THREE.PerspectiveCamera} persp - the perspective camera
   * @param {number} distance - the distance to the scene
   */
  static copyOrthographicToPerspective(ortho, persp, distance = 10)
  {
    ortho.updateMatrixWorld(true);

    const height = (ortho.top - ortho.bottom) / ortho.zoom;
    const newDistance = height /
      (2 * Math.tan(THREE.MathUtils.degToRad(persp.fov) / 2));

    const dir = ortho.getWorldDirection(new THREE.Vector3());
    const focus = ortho.position.clone().addScaledVector(dir, distance);

    persp.position.copy(focus).addScaledVector(dir, -newDistance);
    persp.quaternion.copy(ortho.quaternion);
    persp.up.copy(ortho.up);
    persp.aspect = (ortho.right - ortho.left) / (ortho.top - ortho.bottom);
    persp.zoom = 1;
    persp.far = Math.max(ortho.far, newDistance + distance);

    persp.updateMatrix();
    persp.updateProjectionMatrix();
    persp.updateMatrixWorld(true);
  }

  /**
   * Calculates the bounding box of the given objects in world CS.
   *
   * @param {THREE.Object3D[]} objects - the objects whose bounding box is
   *   to be calculated
   * @param {boolean} includeInvisible - indicates whether invisible objects
   *   are included
   * @returns {THREE.Box3} the bounding box in world CS
   */
  static getBoundingBox(objects, includeInvisible)
  {
    return this.getBoundingBoxFromView(objects, null, includeInvisible);
  }

  /**
   * Calculates the bounding box of the given objects in view CS.
   *
   * @param {THREE.Object3D[]} objects - the objects whose bounding box is
   *   to be calculated
   * @param {THREE.Matrix4} viewMatrixWorld - the camera matrix world
   * @param {boolean} includeInvisible - indicates whether invisible objects
   *   are included
   * @returns {THREE.Box3} the bounding box in view CS
   */
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
      if ((object.visible || includeInvisible) && !ObjectUtils.isGhost(object))
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

  /**
   * Calculates the bounding box of the given object in local CS.
   *
   * @param {THREE.Object3D} object - the object for which the bounding box is
   *   to be calculated
   * @param {boolean} includeInvisible - indicates whether invisible objects
   *   are included
   * @returns {THREE.Box3} the bounding box in object local CS
   */
  static getLocalBoundingBox(object, includeInvisible = false)
  {
    const box = new THREE.Box3(); // empty box
    const objectBox = new THREE.Box3();

    function extendBox(object, toBaseMatrix)
    {
      if ((object.visible || includeInvisible) && !ObjectUtils.isGhost(object))
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

  /**
   * Creates a BufferGeometry that represents the given box.
   *
   * @param {THREE.Box3} box - the box for which to generate the geometry
   * @returns {THREE.BufferGeometry} the geometry of the box
   */
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

  /**
   * Collects the cameras contained in the given object.
   *
   * @param {THREE.Object3D} object - the object from which to start collecting
   *  the cameras
   * @param {THREE.Camera[]} array - the output array
   * @returns {THREE.Camera[]} the output array containing the cameras found
   */
  static findCameras(object, array = [])
  {
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

  /**
   * Collects the materials contained in the given object.
   *
   * @param {THREE.Object3D} object - the object from which to start collecting
   *   the materials
   * @returns {THREE.Material[]} the output array containing the materials found
   */
  static findMaterials(object)
  {
    const array = [];
    let materialSet = new Set();

    object.traverse(obj =>
    {
      let material = obj.material;
      if (material)
      {
        if (!materialSet.has(material.uuid))
        {
          materialSet.add(material.uuid);
          array.push(material);
        }
      }
    });
    return array;
  }

  /**
   * Puts a child object at the given position.
   *
   * @param {THREE.Object3D} object - the object
   * @param {number} index - the chid position
   * @param {THREE.Object3D} child - the child object
   */
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

  /**
   * Tells whether an object is descendant of the specified ancestor.
   *
   * @param {THREE.Object3D} object - the object to test
   * @param {THREE.Object3D} ancestor - the object ancestor
   * @returns {boolean} true only if object is descendant of ancestor
   */
  static isObjectDescendantOf(object, ancestor)
  {
    object = object.parent;
    while (object !== null && object !== ancestor)
    {
      object = object.parent;
    }
    return object === ancestor;
  }

  /**
   * Creates a link with the given name from one object to another.
   *
   * @param {THREE.Object3D} object - the source object
   * @param {THREE.Object3D} relatedObject - the related object
   * @param {string} name - the link name
   */
  static createLink(object, relatedObject, name)
  {
    if (!object.links)
    {
      object.links = {};
    }
    object.links[name || relatedObject.name] = relatedObject;
  }

  /* selection options */

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

  /* export options */

  static isExportable(object)
  {
    if (object.name && object.name.startsWith(THREE.Object3D.HIDDEN_PREFIX))
      return false; // hidden object

    const options = this.getExportOptions(object);
    if (options)
    {
      if (options.export === false) // marked as non exportable
      {
        return false;
      }
    }
    return true;
  }

  static setExportable(object, exportable)
  {
    this.getExportOptions(object, true).export = exportable;
  }

  static isExportableChildren(object)
  {
    const options = this.getExportOptions(object);
    if (options)
    {
      if (options.exportChildren === false) // children non exportable
      {
        return false;
      }
    }
    return true;
  }

  static setExportableChildren(object, exportChildren)
  {
    this.getExportOptions(object, true).exportChildren = exportChildren;
  }

  static getExportOptions(object, create = false)
  {
    let options = object.userData.export;
    if (typeof options !== "object" && create)
    {
      options = {};
      object.userData.export = options;
    }
    return options;
  }

  /* visibility options */

  static isHidden(object, ancestors = false)
  {
    const options = this.getVisibilityOptions(object);
    if (options)
    {
      if (options.hidden === true) return true;
    }
    return ancestors && object.parent && this.isHidden(object.parent, true);
  }

  static setHidden(object, hidden)
  {
    this.getVisibilityOptions(object, true).hidden = Boolean(hidden);
  }

  static isGhost(object)
  {
    const options = this.getVisibilityOptions(object);
    if (options)
    {
      return options.ghost === true;
    }
    return false;
  }

  static setGhost(object, ghost)
  {
    this.getVisibilityOptions(object, true).ghost = Boolean(ghost);
  }

  static getVisibilityOptions(object, create = false)
  {
    let options = object.userData.visibility;
    if (typeof options !== "object" && create)
    {
      options = {};
      object.userData.visibility = options;
    }
    return options;
  }

  /**
   * Scales a model to the specified units.
   *
   * @param {THREE.Object3D} model - the model to scale
   * @param {string} toUnits - the target units
   * @param {string} fromUnits - the original units of the model
   * @returns {boolean} true only when the matrix of the model was updated
   */
  static scaleModel(model, toUnits = "m", fromUnits)
  {
    fromUnits = fromUnits || model.userData.units;
    
    if (fromUnits === toUnits) return false;

    let factor1 = this.METER_CONVERSION_FACTORS[toUnits];
    let factor2 = this.METER_CONVERSION_FACTORS[fromUnits] || model.userData.modelFactor;

    if (typeof factor1 === "number" && typeof factor2 === "number")
    {
      let scale = factor1 / factor2;
      model.scale.set(scale, scale, scale);
      model.updateMatrix();
      return true;
    }
    return false;
  }
};

export { ObjectUtils };