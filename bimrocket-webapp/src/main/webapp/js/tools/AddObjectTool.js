/*
 * AddObjectTool.js
 *
 * @autor: realor
 */

BIMROCKET.AddObjectTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "add_object";
    this.label = "tool.add_object.label";
    this.help = "tool.add_object.help";
    this.className = "add_object";
    this.immediate = true;
    this.setOptions(options);
    this.counter = 0;
  }

  execute()
  {
    var objectType = this.objectType || "group";
    
    var object;
    if (objectType === "group")
    {
      object = new THREE.Group();
      object.name = "Group";
    }
    else
    {
      var geometry;
      switch (objectType)
      {
        case "box":
          geometry = new BIMROCKET.SolidGeometry();
          let vertices = geometry.vertices;
          vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
          vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
          vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
          vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
          
          vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
          vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
          vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
          vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));

          geometry.addFace(3, 2, 1, 0);
          geometry.addFace(4, 5, 6, 7);
          geometry.addFace(0, 1, 5, 4);
          geometry.addFace(1, 2, 6, 5);
          geometry.addFace(2, 3, 7, 6);          
          geometry.addFace(3, 0, 4, 7);
          break;
        case "cylinder":
          geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
          break;        
        case "sphere":
          geometry = new THREE.SphereGeometry(0.5, 24, 24);
          break;
      }
      let rad = THREE.MathUtils.degToRad(90);
      let matrix = new THREE.Matrix4().makeRotationX(rad);
      geometry.applyMatrix4(matrix);
      object = new BIMROCKET.Solid(geometry);
    }
    this.counter++;
    object.name = objectType + "_" + this.counter;

    this.application.addObject(object, null, true);
  }
};
