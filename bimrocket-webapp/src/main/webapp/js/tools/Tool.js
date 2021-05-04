/* 
 * Tool.js
 * 
 * @autor: realor
 */

BIMROCKET.Tool = class
{
  constructor(application)
  {
    this.application = application;
    this.name = "command"; // must be unique
    this.label = "Command";
    this.help = "command help";
    this.className = "command";
    this.immediate = false;
  }
  
  activate()
  {
    console.info("activate " + this.id);
  }
  
  deactivate()
  {    
    console.info("deactivate " + this.id);
  }
      
  execute()
  {
    console.info("execute " + this.id);
  }
      
  setOptions(options)
  {
    if (options)
    {
      for (var option in options)
      {
        this[option] = options[option];
      }
    }
  }
  
  intersect(mousePosition, baseObject, recursive)
  {
    var application = this.application;
    var camera = application.camera;
    var container = application.container;
    var raycaster = new THREE.Raycaster();

    var mousecc = new THREE.Vector2();
    mousecc.x = (mousePosition.x / container.clientWidth) * 2 - 1;
    mousecc.y = -(mousePosition.y / container.clientHeight) * 2 + 1;

    var ray, origin, vector;
    if (camera instanceof THREE.OrthographicCamera)
    {
      vector = new THREE.Vector3(mousecc.x, mousecc.y, 0); // NDC
      vector.unproject(camera); // world

      origin = new THREE.Vector3();
      camera.localToWorld(origin); // world
      var viewVector = new THREE.Vector3(0, 0, -1);
      camera.localToWorld(viewVector); // world
      ray = viewVector.sub(origin);
      origin = vector;
      origin.x -= 1000 * ray.x;
      origin.y -= 1000 * ray.y;
      origin.z -= 1000 * ray.z;
    }
    else // THREE.PerspectiveCamera
    {
      vector = new THREE.Vector3(mousecc.x, mousecc.y, 0); // NDC
      vector.unproject(camera); // world
      origin = new THREE.Vector3();
      camera.localToWorld(origin);
      ray = vector.sub(origin);
    }
    raycaster.set(origin, ray.normalize());
    raycaster.far = Math.Infinity;

    var intersects = raycaster.intersectObjects([baseObject], recursive);
    var i = 0;
    var firstIntersect = null;
    while (i < intersects.length && firstIntersect === null)
    {
      var intersect = intersects[i];
      var object = intersect.object;
      if (application.clippingPlane === null ||
          application.clippingPlane.distanceToPoint(intersect.point) > 0)
      {
        if (this.isPathVisible(object)) firstIntersect = intersect;
      }
      i++;
    }
    return firstIntersect;
  }
  
  isPathVisible(object)
  {
    while (object !== null && object.visible) 
    {
      object = object.parent;
    }
    return object === null;
  }
  
  getMousePosition(event)
  {
    var x = event.offsetX || event.layerX;
    var y = event.offsetY || event.layerY;
    return new THREE.Vector2(x, y);
  }
  
  isCanvasEvent(event)
  {
    if (this.application.menuBar.armed) return false;
    
    var target = event.target || event.srcElement;
    return target.nodeName.toLowerCase() === "canvas";
  }  
};

