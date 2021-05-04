/*
 * SectionTool.js
 *
 * @autor: realor
 */

BIMROCKET.SectionTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "section";
    this.label = "tool.section.label";
    this.help = "tool.section.help";
    this.className = "section";
    this.setOptions(options);

    var plane = new THREE.Plane();
    this.plane = plane;
    this.planes = [this.plane];
    this.noPlanes = [];
    this.basePoint = null;
    this.offset = 0;
    this.meshes = [];

    var backFaceStencilMat = new THREE.MeshBasicMaterial();
    backFaceStencilMat.depthWrite = false;
    backFaceStencilMat.depthTest = false;
    backFaceStencilMat.colorWrite = false;
    backFaceStencilMat.stencilWrite = true;
    backFaceStencilMat.stencilFunc = THREE.AlwaysStencilFunc;
    backFaceStencilMat.side = THREE.BackSide;
    backFaceStencilMat.stencilFail = THREE.IncrementWrapStencilOp;
    backFaceStencilMat.stencilZFail = THREE.IncrementWrapStencilOp;
    backFaceStencilMat.stencilZPass = THREE.IncrementWrapStencilOp;
    backFaceStencilMat.clippingPlanes = this.planes;
    this.backFaceStencilMat = backFaceStencilMat;

    var frontFaceStencilMat = new THREE.MeshBasicMaterial();
    frontFaceStencilMat.depthWrite = false;
    frontFaceStencilMat.depthTest = false;
    frontFaceStencilMat.colorWrite = false;
    frontFaceStencilMat.stencilWrite = true;
    frontFaceStencilMat.stencilFunc = THREE.AlwaysStencilFunc;
    frontFaceStencilMat.side = THREE.FrontSide;
    frontFaceStencilMat.stencilFail = THREE.DecrementWrapStencilOp;
    frontFaceStencilMat.stencilZFail = THREE.DecrementWrapStencilOp;
    frontFaceStencilMat.stencilZPass = THREE.DecrementWrapStencilOp;
    frontFaceStencilMat.clippingPlanes = this.planes;
    this.frontFaceStencilMat = frontFaceStencilMat;

    var planeStencilMat = new THREE.MeshLambertMaterial();
    planeStencilMat.color = new THREE.Color(0xffffff);
    planeStencilMat.emissive = new THREE.Color(0x202020);
    planeStencilMat.side = THREE.DoubleSide;
//    planeStencilMat.polygonOffset = true;
//    planeStencilMat.polygonOffsetFactor = 1;
    planeStencilMat.stencilWrite = true;
    planeStencilMat.flatShading = true;
    planeStencilMat.stencilRef = 0;
    planeStencilMat.stencilFunc = THREE.NotEqualStencilFunc;
    planeStencilMat.stencilFail = THREE.ReplaceStencilOp;
    planeStencilMat.stencilZFail = THREE.ReplaceStencilOp;
    planeStencilMat.stencilZPass = THREE.ReplaceStencilOp;
    var loader = new THREE.TextureLoader();
    loader.load("textures/cement.png", 
      function(texture) 
      {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(200, 200);
        planeStencilMat.map = texture;
        planeStencilMat.needsUpdate = true; 
      });
    this.planeStencilMat = planeStencilMat;

    var planeGeom = new THREE.PlaneBufferGeometry(100, 100);
    var planeMesh = new THREE.Mesh(planeGeom, planeStencilMat);
    planeMesh.renderOrder = 1;
    planeMesh.raycast = function(){};
    planeMesh.name = "sectionPlane";
    this.planeMesh = planeMesh;

    this._onMouseUp = this.onMouseUp.bind(this);
    this._onMouseWheel = this.onMouseWheel.bind(this);
    this.createPanel();
  }

  createPanel()
  {
    var application = this.application;

    this.panel = application.createPanel(
      "panel_" + this.name, this.label, "left");
    this.panel.preferredHeight = 160;

    var helpElem = document.createElement("div");
    helpElem.innerHTML = I18N.get(this.help);
    this.panel.bodyElem.appendChild(helpElem);

    this.offsetElem = document.createElement("div");
    this.offsetElem.style.textAlign = "center";
    this.offsetElem.style.marginTop = "20px";
    this.offsetElem.style.display = "none";

    this.offsetLabelElem = document.createElement("label");
    this.offsetLabelElem.innerHTML = "Offset:";
    this.offsetLabelElem.htmlFor = "section_offset";
    this.offsetLabelElem.style.marginRight = "4px";
    this.offsetElem.appendChild(this.offsetLabelElem);

    this.offsetInputElem = document.createElement("input");
    this.offsetInputElem.type = "number";
    this.offsetInputElem.id = "section_offset";
    this.offsetInputElem.style.width = "80px";
    this.offsetInputElem.step = 0.1;
    this.offsetElem.appendChild(this.offsetInputElem);
    
    var scope = this;
    this.offsetInputElem.addEventListener("change", function(event)
    {
      scope.offset = parseFloat(scope.offsetInputElem.value);
      scope.updatePlane();
      application.repaint();      
    }, false);

    this.panel.bodyElem.appendChild(this.offsetElem);
  }

  activate()
  {
    this.panel.visible = true;
    var container = this.application.container;
    container.addEventListener('mouseup', this._onMouseUp, false);
    container.addEventListener('mousewheel', this._onMouseWheel, false);
    container.addEventListener('DOMMouseScroll', this._onMouseWheel, false);
  }

  deactivate()
  {
    this.panel.visible = false;
    var container = this.application.container;
    container.removeEventListener('mouseup', this._onMouseUp, false);
    container.removeEventListener('mousewheel', this._onMouseWheel, false);
    container.removeEventListener('DOMMouseScroll', this._onMouseWheel, false);
  }

  onMouseUp(event)
  {
    if (!this.isCanvasEvent(event)) return;

    var mousePosition = this.getMousePosition(event);
    var application = this.application;
    var scene = application.scene;

    var intersect = this.intersect(mousePosition, scene, true);
    if (intersect)
    {
      var object = intersect.object;
      this.basePoint = intersect.point; // world
      var v1 = new THREE.Vector3(0, 0, 0); // local
      var v2 = intersect.face.normal.clone(); // local

      v1.applyMatrix4(object.matrixWorld);
      v2.applyMatrix4(object.matrixWorld);

      var normal = new THREE.Vector3().subVectors(v1, v2).normalize();
      this.plane.normal = normal;
      this.offset = 0;
      this.updatePlane();

      this.enableClipping();
    }
    else
    {
      this.disableClipping();
    }
    this.updateOffsetLabel();
    application.repaint();
  }

  onMouseWheel(event)
  {
    if (!this.isCanvasEvent(event)) return;

    var application = this.application;

    if (!application.renderer.localClippingEnabled) return;

    var delta = 0;
    if (event.wheelDelta)
    { // WebKit / Opera / Explorer 9
      delta = event.wheelDelta * 0.0005;
    }
    else if (event.detail)
    { // Firefox
      delta = -0.02 * event.detail;
    }
    this.offset += delta;

    this.offset = Math.round(1000 * this.offset) / 1000;

    this.updatePlane();
    this.updateOffsetLabel();

    application.repaint();
  }

  enableClipping()
  {
    var application = this.application;
    if (application.renderer.localClippingEnabled) return;

    var scope = this;

    application.baseObject.traverse(function(object)
    {
      var material = object.material;
      if (material && object.visible)
      {
        material.clippingPlanes = scope.planes;

        if (object instanceof THREE.Mesh)
        {
          if (object.geometry instanceof BIMROCKET.SolidGeometry)
          {
            let geometry = object.geometry;
            if (geometry.isManifold && geometry.faces.length >= 4)
            {
              scope.meshes.push(object);
            }
          }
        }
      }
    });

    for (var i = 0; i < scope.meshes.length; i++)
    {
      var mesh = scope.meshes[i];

      var backMesh = new THREE.Mesh(mesh.geometry, scope.backFaceStencilMat);
      backMesh.name = BIMROCKET.HIDDEN_PREFIX + "backMesh";
      backMesh.raycast = function(){};
      mesh.add(backMesh);
      backMesh.updateMatrix();

      var frontMesh = new THREE.Mesh(mesh.geometry, scope.frontFaceStencilMat);
      frontMesh.name = BIMROCKET.HIDDEN_PREFIX + "frontMesh";
      frontMesh.raycast = function(){};
      mesh.add(frontMesh);
      frontMesh.updateMatrix();
    }

    application.clippingGroup.add(this.planeMesh);
    application.clippingPlane = this.plane;
    application.renderer.localClippingEnabled = true;
  }

  disableClipping()
  {
    var application = this.application;
    if (!application.renderer.localClippingEnabled) return;

    application.clippingGroup.remove(this.planeMesh);
    application.clippingPlane = null;

    var scope = this;

    for (var i = 0; i < scope.meshes.length; i++)
    {
      var mesh = scope.meshes[i];

      var frontMesh = mesh.getObjectByName(BIMROCKET.HIDDEN_PREFIX + "frontMesh");
      if (frontMesh)
      {
        mesh.remove(frontMesh);
      }

      var backMesh = mesh.getObjectByName(BIMROCKET.HIDDEN_PREFIX + "backMesh");
      if (backMesh)
      {
        mesh.remove(backMesh);
      }
    }

    application.baseObject.traverse(function(object)
    {
      var material = object.material;
      if (material && object.visible)
      {
        material.clippingPlanes = scope.noPlanes;
      }
    });

    this.meshes = [];
    this.basePoint = null;

    application.renderer.localClippingEnabled = false;
  }

  updatePlane()
  {
    var planeMesh = this.planeMesh;
    var normal = this.plane.normal;

    var position = this.basePoint.clone().addScaledVector(normal, this.offset);
    this.plane.setFromNormalAndCoplanarPoint(normal, position);

    var vz = normal;
    var vy = BIMROCKET.GeometryUtils.orthogonalVector(vz);
    var vx = new THREE.Vector3();
    vx.crossVectors(vy, vz);

    var matrix = new THREE.Matrix4();

    matrix.set(
      vx.x, vy.x, vz.x, position.x,
      vx.y, vy.y, vz.y, position.y,
      vx.z, vy.z, vz.z, position.z,
          0,   0,    0,     1);

    matrix.decompose(planeMesh.position, planeMesh.quaternion, planeMesh.scale);

    planeMesh.updateMatrix();
  }

  updateOffsetLabel()
  {
    if (this.application.renderer.localClippingEnabled)
    {
      this.offsetElem.style.display = "block";
      this.offsetInputElem.value = this.offset.toFixed(3);
    }
    else
    {
      this.offsetElem.style.display = "none";
    }
  }
};
