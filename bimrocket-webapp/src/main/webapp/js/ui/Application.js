/**
 * Application.js
 *
 * @author realor
 */

import { Panel, PanelManager } from "../ui/Panel.js";
import { ProgressBar } from "../ui/ProgressBar.js";
import { MenuBar } from "../ui/Menu.js";
import { Tool } from "../tools/Tool.js";
import { ToolBar } from "../ui/ToolBar.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { Cord } from "../core/Cord.js";
import { Profile } from "../core/Profile.js";
import { Solid } from "../core/Solid.js";
import { ObjectBuilder } from "../builders/ObjectBuilder.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { ServiceManager } from "../io/ServiceManager.js";
import { IOManager } from "../io/IOManager.js";
import { Selection } from "../utils/Selection.js";
import { Setup } from "../utils/Setup.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { WebUtils } from "../utils/WebUtils.js";
import { ModuleLoader } from "../utils/ModuleLoader.js";
import { WEBGL } from "../utils/WebGL.js";
import { PointSelector } from "../utils/PointSelector.js";
import { LineDashedShaderMaterial } from "../materials/LineDashedShaderMaterial.js";
import { Inspector } from "../ui/Inspector.js";
import { CSS2DRenderer } from "../renderers/CSS2DRenderer.js";
import { FakeRenderer } from "../renderers/FakeRenderer.js";
import { Formula } from "../formula/Formula.js";
import { LoginDialog } from "./LoginDialog.js";
import { ScriptDialog } from "./ScriptDialog.js";
import { EffectComposer } from "../postprocessing/EffectComposer.js";
import { RenderPass } from "../postprocessing/RenderPass.js";
import { SAOPass } from "../postprocessing/SAOPass.js";
import { OutputPass } from "../postprocessing/OutputPass.js";
import { ObjectBatcher } from "../utils/ObjectBatcher.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "three";

class Application
{
  static NAME = "BIMROCKET";
  static VERSION = "$VERSION$";
  static EDGES_SELECTION = "edges";
  static FACES_SELECTION = "faces";
  static UNITS = [
    ["km", "units.km"],
    ["m", "units.m"],
    ["cm", "units.cm"],
    ["mm", "units.mm"],
    ["in", "units.in"]
  ];
  static SET_SELECTION_MODE = "set";
  static ADD_SELECTION_MODE = "add";
  static REMOVE_SELECTION_MODE = "remove";
  static LARGE_MESH_SIZE = 100000;

  constructor(element = document.body)
  {
    this.element = element;
    this.i18n = new I18N();
    this.scene = null;
    this.camera = null;
    this.perspectiveCamera = null;
    this.orthographicCamera = null;
    this.baseObject = null;
    this.clippingPlane = null;
    this.clippingGroup = null;
    this.batchGroup = null;
    this.overlays = null;
    this.tools = {};
    this.tool = null;

    /* services */
    this.services = {}; // Service instances

    /* selection */
    this.selection = new Selection(this, true);
    this.selectionMode = Application.SET_SELECTION_MODE;
    this._selectionLines = null;
    this._axisLines = null;

    /* setup */
    this.setup = new Setup(this);

    /* rendering */
    this._needsRepaint = true;
    this._sceneSimplificationLevel = 0; // 0: disabled

    /* events */
    this._copyObjects = [];
    this._cutObjects = [];
    this._eventListeners = {
      scene : [],
      selection : [],
      animation : [],
      render : [],
      tool : []
    };

    this.params = WebUtils.getQueryParams();

    this.loadingManager = new THREE.LoadingManager();
    const loadingManager = this.loadingManager;
    loadingManager.onStart = (url, itemsLoaded, itemsTotal) =>
    {
      if (!url.startsWith("data:"))
      {
        console.info(url, itemsLoaded, itemsTotal);
      }
    };
    loadingManager.onLoad = () =>
    {
      console.info("Load completed.");
      this.repaint();
    };

   	THREE.Object3D.DEFAULT_MATRIX_AUTO_UPDATE = false;
   	THREE.Object3D.DEFAULT_UP = new THREE.Vector3(0, 0, 1);
    THREE.Object3D.HIDDEN_PREFIX = ".";

    /* create sub elements */

    const logoPanelElem = document.createElement("div");
    this.logoPanel = logoPanelElem;
    logoPanelElem.className = "logo_panel";
    logoPanelElem.addEventListener("click", () => this.hideLogo());
    element.appendChild(logoPanelElem);

    const bigLogoImage = document.createElement("img");
    bigLogoImage.src = "css/images/bimrocket.svg";
    bigLogoImage.title = Application.NAME;
    bigLogoImage.alt = Application.NAME;
    logoPanelElem.appendChild(bigLogoImage);

    const splash = this.params["splash"];
    if (splash)
    {
      const splashPanelElem = document.createElement("div");
      this.splashPanel = splashPanelElem;
      splashPanelElem.className = "splash_panel";
      element.appendChild(splashPanelElem);

      if (splash.startsWith("url:"))
      {
        this.loadSplashContent(splash.substring(4), splashPanelElem);
      }
      else
      {
        const splashContentElem = document.createElement("div");
        splashContentElem.textContent = splash;
        splashContentElem.className = "fade";
        splashPanelElem.appendChild(splashContentElem);
      }
    }

    const headerElem = document.createElement("header");
    this.headerElem = headerElem;
    element.appendChild(headerElem);

    const logoLink = document.createElement("a");
    logoLink.className = "logo_link";
    logoLink.addEventListener("click", event => this.showLogo());
    headerElem.appendChild(logoLink);

    const logoImage = document.createElement("img");
    logoImage.src = "css/images/bimrocket.svg";
    logoImage.title = Application.NAME;
    logoImage.alt = Application.NAME;
    logoLink.appendChild(logoImage);

    const toolBarElem = document.createElement("div");
    this.toolBarElem = toolBarElem;
    toolBarElem.className = "toolbar";
    element.appendChild(toolBarElem);

    const container = document.createElement("div");
    container.id = "container";
    container.className = "container";
    container.style.touchAction = "none";
    this.container = container;
    element.appendChild(container);

    const progressBarElem = document.createElement("div");
    progressBarElem.className = "progress_bar";
    element.appendChild(progressBarElem);

    const setup = this.setup;

    // renderer
    let renderer;
    if (WEBGL.isWebGLAvailable())
    {
      // WebGL renderer
      renderer = new THREE.WebGLRenderer(
      {
        antialias : true,
        stencil : true,
        alpha : true,
        preserveDrawingBuffer : true
      });
      renderer.shadowMap.enabled = setup.shadowsEnabled;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    else
    {
      // fake renderer
      renderer = new FakeRenderer();
    }
    this.renderer = renderer;
    renderer.alpha = true;
    renderer.setClearColor(0x000000, 0);
    renderer.sortObjects = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    let cssRenderer = new CSS2DRenderer();
    cssRenderer.setSize(container.clientWidth, container.clientHeight);
    cssRenderer.domElement.style.position = "absolute";
    cssRenderer.domElement.style.top = "0";
    cssRenderer.domElement.style.bottom = "0";
    cssRenderer.domElement.style.left = "0";
    cssRenderer.domElement.style.right = "0";
    cssRenderer.domElement.style.right = "0";
    this.cssRenderer = cssRenderer;
    container.appendChild(cssRenderer.domElement);

    // panelManager
    this.panelManager = new PanelManager(this);

    // general tabbed panel
    this.progressBar = new ProgressBar(progressBarElem);

    // menuBar
    this.menuBar = new MenuBar(this, headerElem);

     // toolBar
    this.toolBar = new ToolBar(this, toolBarElem);

    /* selection materials */

    const selectionColor = new THREE.Color(0, 0, 1);

    this.selectionMaterial = new THREE.LineBasicMaterial(
      { color: selectionColor, linewidth: 1.5,
        depthTest: true, depthWrite: true, transparent : true });

    this.deepSelectionMaterial = new THREE.LineBasicMaterial(
      { color: selectionColor, linewidth: 1.5,
        depthTest: false, depthWrite: false, transparent : true });

    this.boxSelectionMaterial = new THREE.LineBasicMaterial(
      { color: selectionColor, linewidth: 1.5,
        depthTest: true, depthWrite: true });

    this.invisibleSelectionMaterial = new LineDashedShaderMaterial(
      { color: selectionColor, dashSize: 4, gapSize: 4,
        depthTest: true, depthWrite: true });

    this.deepInvisibleSelectionMaterial = new LineDashedShaderMaterial(
      { color: selectionColor, dashSize: 4, gapSize: 4,
        depthTest: false, depthWrite: false, transparent : true });


    this.pointSelector = new PointSelector(this);

    // apply setup
    this.i18n.userLanguages = setup.userLanguage;
    this.setShadowMapEnabled(setup.shadowsEnabled);
    setup.applyBackground();

    // init scene
    this.initScene();

    // listeners
    this.addEventListener("scene", event =>
    {
      if (event.type === "cameraActivated")
      {
        this.setupComposer();
        this.repaint();
      }
      else if (event.type !== "cut")
      {
        let clearBatch = false;
        if (event.type === "nodeChanged")
        {
          let updateSelection = false;
          for (let object of event.objects)
          {
            if (event.source !== ObjectBuilder)
            {
              object.needsRebuild = true;
            }

            if (object instanceof THREE.Camera)
            {
              if (event.source instanceof Inspector)
              {
                // inspector has changed a camera
                const camera = object;
                camera.updateProjectionMatrix();
              }
            }
            else // a non Camera object was changed
            {
              if (ObjectUtils.isObjectDescendantOf(object, this.baseObject))
              {
                clearBatch = true;
              }
            }

            if (this.selection.contains(object))
            {
              updateSelection = true;
            }
          }

          if (updateSelection) this.updateSelection();
        }
        else if (event.type === "added" || event.type === "removed")
        {
          this.cssRenderer.cssObjects = -1; // force css rendering
          event.parent.needsRebuild = true;
          clearBatch = true;
        }
        else if (event.type === "structureChange")
        {
          this.cssRenderer.cssObjects = -1; // force css rendering
          clearBatch = true;
        }
        if (clearBatch)
        {
          this.disableBatch();
        }
        this.repaint();
      }
    });

    this.addEventListener("selection", event =>
    {
      if (event.type === "changed")
      {
        this.updateSelection();
      }
    });

    window.addEventListener("resize", this.onResize.bind(this), false);

    window.addEventListener("beforeunload", event =>
    {
      if (this.baseObject.children.length > 0)
      {
        event.preventDefault();
        event.returnValue = "";
      }
    });

    // animation
    let animationClock = new THREE.Clock();
    let _animationEvent = { delta : 0 };
    let _slownessCounter = 0;

    let animate = () =>
    {
      requestAnimationFrame(animate);

      _animationEvent.delta = animationClock.getDelta();

      if (this._eventListeners.animation.length > 0)
      {
        this.notifyEventListeners("animation", _animationEvent);
      }

      if (setup.renderMode === "simplified")
      {
        if (this._needsRepaint)
        {
          const fps = 1 / _animationEvent.delta;

          if (fps < setup.requestedFPS)
          {
            if (_slownessCounter < 2)
            {
              _slownessCounter++;
            }
            else if (this._sceneSimplificationLevel < 2)
            {
              this._sceneSimplificationLevel++;
              this.updateSceneSimplification(); // enable simplification
            }
          }
          this.render();
        }
        else
        {
          _slownessCounter = 0;
          if (this._sceneSimplificationLevel > 0)
          {
            this._sceneSimplificationLevel = 0; // disable simplification
            this.updateSceneSimplification();
            this.render();
          }
        }
      }
      else if (setup.renderMode === "batch")
      {
        if (this._needsRepaint)
        {
          if (!this.batchGroup)
          {
            const fps = 1 / _animationEvent.delta;
            if (fps < setup.requestedFPS)
            {
              if (_slownessCounter < 2)
              {
                _slownessCounter++;
              }
              else
              {
                this.enableBatch();
              }
            }
          }
          this.render();
        }
        else
        {
          _slownessCounter = 0;
        }
      }
      else // normal
      {
        if (this._needsRepaint)
        {
          this.render();
        }
      }
    };

    animate();
    this.loadModules();
  }

  updateSceneSimplification()
  {
    const level = this._sceneSimplificationLevel;

    let minSize = Infinity;
    let maxSize = 0;
    let objectCount = 0;
    let sum = 0;
    let mediumSize = 0;

    if (level === 2)
    {
      // calc object medium size
      this.scene.traverseVisible(object =>
      {
        if (object instanceof Solid)
        {
          let sphere = object.geometry.boundingSphere;
          if (sphere === null)
          {
            object.geometry.computeBoundingSphere();
            sphere = object.geometry.boundingSphere;
          }
          const scale = object.matrixWorld.getMaxScaleOnAxis();
          const size = sphere.radius * scale;
          if (size < minSize) minSize = size;
          else if (size > maxSize) maxSize = size;
          objectCount++;
          sum += size;
        }
      });
      mediumSize = sum / objectCount;
    }


    this.scene.traverseVisible(object =>
    {
      if (object instanceof Solid)
      {
        let sphere = object.geometry.boundingSphere;
        if (sphere === null)
        {
          object.geometry.computeBoundingSphere();
          sphere = object.geometry.boundingSphere;
        }
        const scale = object.matrixWorld.getMaxScaleOnAxis();
        const size = sphere.radius * scale;

        switch (level)
        {
          case 0: // disable fast rendering
            if (object._facesVisible !== undefined)
            {
              object.facesVisible = object._facesVisible;
            }
            if (object._edgesVisible !== undefined)
            {
              object.edgesVisible = object._edgesVisible;
            }
            break;

          case 1: // hide all edges
            object._edgesVisible = object.edgesVisible;
            object.edgesVisible = false;
            break;

          case 2: // hide faces objects smaller than mediumSize
            if (size < mediumSize)
            {
              object._facesVisible = object.facesVisible;
              object.facesVisible = false;
            }
            break;
        }
      }
    });
  }

  enableBatch()
  {
    if (this.batchGroup === null)
    {
      try
      {
        const batcher = new ObjectBatcher();
        this.batchGroup = batcher.batch(this.baseObject);
        this.overlays.add(this.batchGroup);
        console.info("batch enabled");
      }
      catch (ex)
      {
        console.error(ex);
        this.setup.renderMode = "simplified";
      }
    }
  }

  disableBatch()
  {
    if (this.batchGroup)
    {
      this.batchGroup.removeFromParent();
      ObjectUtils.dispose(this.batchGroup);
      this.batchGroup = null;
      console.info("batch disabled");
    }
  }

  setupComposer()
  {
    if (this.composer)
    {
      for (let pass of this.composer.passes)
      {
        pass.dispose();
      }
      this.composer.dispose();
      this.composer = null;
      this.ambientOcclusionParams = null;
    }

    if (!this.setup.ambientOcclusionEnabled) return;

    const scene = this.scene;
    const camera = this.camera;
    const container = this.container;
    const setup = this.setup;
    const composer = new EffectComposer(this.renderer);
    composer.setPixelRatio(window.devicePixelRatio);
    this.composer = composer;

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const saoPass = new SAOPass(scene, camera, container.clientWidth, container.clientHeight);
    saoPass.params.saoBias = 0.5;
    saoPass.params.saoIntensity = setup.ambientOcclusionIntensity;
    saoPass.params.saoScale = 1000;
		saoPass.params.saoKernelRadius = 100;
    saoPass.params.saoMinResolution = 0;
    saoPass.params.saoBlur = true;
    saoPass.params.saoBlurRadius = 8;
    saoPass.params.saoBlurStdDev = 4;
    saoPass.params.saoBlurDepthCutoff = 0.01;
    composer.addPass(saoPass);
    this.ambientOcclusionParams = saoPass.params;

    const outputPass = new OutputPass();
    composer.addPass(outputPass);
  }

  initScene()
  {
    const container = this.container;

    if (this.scene)
    {
      ObjectUtils.dispose(this.scene);
      this.stopControllers();
      this.disableBatch();
    }

    this.scene = new THREE.Scene();
    const scene = this.scene;
    ObjectUtils.setSelectionHighlight(scene, ObjectUtils.HIGHLIGHT_NONE);
    scene.name = "Scene";

    // Add lights
    const hemisphereLight = new THREE.HemisphereLight(0xf0f0f0, 0x808080, 1);
    hemisphereLight.name = "HemisphereLight";
    hemisphereLight.updateMatrix();
    hemisphereLight.intensity = 3;
    scene.add(hemisphereLight);

    const sunLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    sunLight.position.x = 20;
    sunLight.position.y = 20;
    sunLight.position.z = 80;
    sunLight.name = "SunLight";
    sunLight.castShadow = true;
    sunLight.intensity = 3;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.left = -40;
    sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -40;
    sunLight.shadow.camera.far = 3000;
    sunLight.shadow.camera.near = 0.01;
    sunLight.shadow.camera.matrixAutoUpdate = true;
    sunLight.shadow.bias = -0.0001;
    sunLight.target = scene;
    scene.add(sunLight);
    sunLight.updateMatrix();

    // initial camera
    let camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 4000);
    camera.position.set(0, -30, 2);
    camera.name = "Orthographic";
    camera.updateProjectionMatrix();
    camera.updateMatrix();
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.updateMatrix();
    scene.add(camera);
    this.orthographicCamera = camera;

    camera = new THREE.PerspectiveCamera(60,
      container.clientWidth / container.clientHeight, 0.1, 4000);
    camera.position.set(0, -10, 0.2);
    camera.name = "Perspective";
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    camera.updateMatrix();
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.updateMatrix();
    scene.add(camera);
    this.perspectiveCamera = camera;

    this.camera = camera;

    // Add base group
    this.baseObject = new THREE.Group();
    const baseObject = this.baseObject;
    baseObject.name = "Base";
    ObjectUtils.setSelectionHighlight(baseObject, ObjectUtils.HIGHLIGHT_NONE);

    baseObject.updateMatrix();

    scene.add(baseObject);

    // Add clipping group
    this.clippingGroup = new THREE.Group();
    this.clippingGroup.name = THREE.Object3D.HIDDEN_PREFIX + "clipping";
    this.scene.add(this.clippingGroup);

    // Add overlays group
    this.overlays = new THREE.Group();
    this.overlays.name = THREE.Object3D.HIDDEN_PREFIX + "overlays";
    this.scene.add(this.overlays);

    // reset copy/cut arrays
    this._copyObjects = [];
    this._cutObjects = [];

    let sceneEvent = {type : "structureChanged",
      objects : [this.scene], source : this};
    this.notifyEventListeners("scene", sceneEvent);

    this.selection.set(baseObject);

    this.setupComposer();
  }

  render()
  {
    const clippingEnabled = this.clippingPlane !== null;

    if (this.batchGroup)
    {
      this.batchGroup.visible = !clippingEnabled;
      this.baseObject.visible = clippingEnabled;
    }

    // wegl renderer
    if (this.composer && !clippingEnabled)
    {
      this.composer.render();
    }
    else
    {
      this.renderer.render(this.scene, this.camera);
    }

    // css renderer
    this.cssRenderer.render(this.scene, this.camera);
    this._needsRepaint = false;

    this.baseObject.visible = true;
  }

  repaint()
  {
    this._needsRepaint = true;
  }

  setShadowMapEnabled(enabled)
  {
    if (this.renderer.shadowMap)
    {
      if (this.renderer.shadowMap.enabled !== enabled)
      {
        this.renderer.shadowMap.enabled = enabled;
        this.scene.traverse(object =>
        { if (object.material) object.material.needsUpdate = true; });
        this.repaint();
      }
    }
  }

  /* gets the model root depending on selection */
  getModelRoot(lowestRoot = false)
  {
    let root;
    const roots = this.selection.roots;
    const baseObject = this.baseObject;

    if (roots.length === 0) // nothing selected
    {
      if (baseObject.children.length === 1)
      {
        root = baseObject.children[0];
      }
      else
      {
        root = baseObject;
      }
    }
    else if (roots.length === 1)
    {
      root = roots[0];
      if (!lowestRoot)
      {
        // find top root (under baseObject)
        while (root.parent !== baseObject &&
               root !== this.scene && root !== baseObject)
        {
          root = root.parent;
        }
      }
    }
    else // multiple roots
    {
      root = baseObject;
    }
    return root;
  }

  updateSelection()
  {
    this.hideSelectionLines();
    this.showSelectionLines();

    this.hideAxisLines();
    if (this.setup.showLocalAxes)
    {
      this.showAxisLines();
    }
  }

  hideSelectionLines()
  {
    if (this._selectionLines !== null)
    {
      this.overlays.remove(this._selectionLines);
      ObjectUtils.dispose(this._selectionLines);
      this._selectionLines = null;
      this.repaint();
    }
  }

  showSelectionLines()
  {
    if (this._selectionLines === null && !this.selection.isEmpty())
    {
      const linesGroup = new THREE.Group();
      linesGroup.renderOrder = 1;
      linesGroup.name = "SelectionLines";
      const iterator = this.selection.iterator;
      let item = iterator.next();
      while (!item.done)
      {
        let object = item.value;
        this.collectLines(object, linesGroup);
        item = iterator.next();
      }
      this._selectionLines = linesGroup;
      this.overlays.add(this._selectionLines);
      this.repaint();
    }
  }

  transformSelectionLines(matrix)
  {
    if (this._selectionLines !== null)
    {
      const lines = this._selectionLines;
      matrix.decompose(lines.position, lines.quaternion, lines.scale);
      lines.updateMatrix();
      this.repaint();
    }
  }

  collectLines(object, linesGroup)
  {
    const highlight = ObjectUtils.getSelectionHighlight(object)
          || ObjectUtils.HIGHLIGHT_EDGES;
    if (highlight === ObjectUtils.HIGHLIGHT_NONE) return;

    let material = this.getSelectionMaterial(object);

    if (object instanceof Solid)
    {
      let solid = object;

      if (this.setup.selectionPaintMode === Application.EDGES_SELECTION)
      {
        let edgesGeometry = solid.edgesGeometry;
        if (edgesGeometry)
        {
          let lines = new THREE.LineSegments(edgesGeometry, material);

          lines.name = "SelectionLines";
          lines.raycast = function(){};

          solid.updateMatrixWorld();
          solid.matrixWorld.decompose(
            lines.position, lines.rotation, lines.scale);
          lines.updateMatrix();
          linesGroup.add(lines);
        }
      }
      else // show faces (triangles)
      {
        let geometry = solid.geometry;
        if (geometry)
        {
          let edgesGeometry = geometry.getTrianglesGeometry();

          let lines = new THREE.LineSegments(edgesGeometry, material);
          lines.name = "SelectionLines";
          lines.raycast = function(){};

          solid.updateMatrixWorld();
          solid.matrixWorld.decompose(
            lines.position, lines.rotation, lines.scale);
          lines.updateMatrix();
          linesGroup.add(lines);
        }
      }
    }
    else if (object instanceof THREE.Camera)
    {
      let camera = object;
      if (camera !== this.camera)
      {
        camera.updateMatrixWorld();
        let lines = new THREE.CameraHelper(camera);
        lines.updateMatrix();

        lines.name = "SelectionLines";
        lines.raycast = function(){};
        linesGroup.add(lines);
      }
    }
    else if (object instanceof THREE.DirectionalLight)
    {
      let light = object;
      let lines = new THREE.DirectionalLightHelper(light, 1, 0x0);
      lines.name = "SelectionLines";
      lines.raycast = function(){};
      lines.lightPlane.updateMatrix();
      lines.targetLine.updateMatrix();

      linesGroup.add(lines);
    }
    else if (object instanceof THREE.Mesh)
    {
      let mesh = object;

      if (mesh.geometry.attributes?.position?.array?.length >
          Application.LARGE_MESH_SIZE)
      {
        let box = ObjectUtils.getLocalBoundingBox(mesh, true);
        if (!box.isEmpty())
        {
          let geometry = ObjectUtils.getBoxGeometry(box);

          let lines = new THREE.LineSegments(geometry, mesh.visible ?
            this.boxSelectionMaterial : material);
          lines.raycast = function(){};

          mesh.updateMatrixWorld();
          mesh.matrixWorld.decompose(
            lines.position, lines.rotation, lines.scale);
          lines.updateMatrix();
          linesGroup.add(lines);
        }
      }
      else
      {
        mesh.updateMatrixWorld();
        let edgesGeometry = new THREE.EdgesGeometry(mesh.geometry);

        let lines = new THREE.LineSegments(edgesGeometry, material);
        lines.raycast = function(){};
        lines.name = "OuterLines";
        mesh.matrixWorld.decompose(
          lines.position, lines.rotation, lines.scale);
        lines.updateMatrix();
        linesGroup.add(lines);
      }
    }
    else if (object instanceof THREE.Points)
    {
      object.updateMatrixWorld();

      let box = ObjectUtils.getLocalBoundingBox(object, true);
      if (!box.isEmpty())
      {
        let geometry = ObjectUtils.getBoxGeometry(box);

        let lines = new THREE.LineSegments(geometry, object.visible ?
          this.boxSelectionMaterial : material);
        lines.raycast = function(){};

        object.matrixWorld.decompose(
          lines.position, lines.rotation, lines.scale);
        lines.updateMatrix();
        linesGroup.add(lines);
      }
    }
    else if (object instanceof Cord)
    {
      object.updateMatrixWorld();

      let lines = new THREE.LineSegments(object.geometry, material);
      lines.raycast = function(){};
      lines.name = "Lines";
      object.matrixWorld.decompose(
        lines.position, lines.rotation, lines.scale);
      lines.updateMatrix();
      linesGroup.add(lines);
    }
    else if (object instanceof Profile)
    {
      object.updateMatrixWorld();

      let lines = new THREE.LineSegments(object.geometry, material);
      lines.raycast = function(){};
      lines.name = "Lines";
      object.matrixWorld.decompose(
        lines.position, lines.rotation, lines.scale);
      lines.updateMatrix();
      linesGroup.add(lines);
    }
    else if (object instanceof THREE.Group || object instanceof THREE.Object3D)
    {
      object.updateMatrixWorld();

      if (highlight === ObjectUtils.HIGHLIGHT_EDGES)
      {
        let children = object.children;
        for (let i = 0; i < children.length; i++)
        {
          var child = children[i];
          this.collectLines(child, linesGroup);
        }
      }
      else if (highlight === ObjectUtils.HIGHLIGHT_BOX)
      {
        let box = ObjectUtils.getLocalBoundingBox(object, true);
        if (!box.isEmpty())
        {
          let geometry = ObjectUtils.getBoxGeometry(box);

          let lines = new THREE.LineSegments(geometry, object.visible ?
            this.boxSelectionMaterial : material);
          lines.raycast = function(){};

          object.matrixWorld.decompose(
            lines.position, lines.rotation, lines.scale);
          lines.updateMatrix();
          linesGroup.add(lines);
        }
      }
    }
  }

  getSelectionMaterial(object)
  {
    if (object.visible)
    {
      return this.setup.showDeepSelection ?
        this.deepSelectionMaterial : this.selectionMaterial;
    }
    else
    {
      return this.setup.showDeepSelection ?
        this.deepInvisibleSelectionMaterial : this.invisibleSelectionMaterial;
    }
  }

  hideAxisLines()
  {
    if (this._axisLines !== null)
    {
      this.overlays.remove(this._axisLines);
      ObjectUtils.dispose(this._axisLines);
      this._axisLines = null;
      this.repaint();
    }
  }

  showAxisLines()
  {
    if (this._axisLines === null)
    {
      var object = this.selection.object;
      if (object)
      {
        this._axisLines = new THREE.AxesHelper(1);

        var lines = this._axisLines;
        lines.name = "AxisLines";
        object.updateMatrixWorld(true);
        object.matrixWorld.decompose(
          lines.position, lines.rotation, lines.scale);
        lines.updateMatrix();
        lines.raycast = function(){};
        lines.material.depthTest = false;
        lines.material.depthWrite = false;

        this.overlays.add(lines);
        this.repaint();
      }
    }
  }

  addEventListener(type, eventListener)
  {
    var eventListeners = this._eventListeners[type];
    if (eventListeners)
    {
      eventListeners.push(eventListener);
    }
  }

  removeEventListener(type, eventListener)
  {
    var eventListeners = this._eventListeners[type];
    if (eventListeners)
    {
      var index = eventListeners.indexOf(eventListener);
      if (index !== -1)
      {
        eventListeners.splice(index, 1);
      }
    }
  }

  notifyEventListeners(type, event)
  {
    const eventListeners = this._eventListeners[type];
    for (let listener of eventListeners)
    {
      listener(event);
    }
  }

  isCanvasEvent(event)
  {
    if (this.menuBar.armed) return false;

    let elem = event.target;

    while (elem !== this.container)
    {
      if (elem.classList.contains("panel") ||
          elem.classList.contains("resizer")) return false;
      elem = elem.parentElement;
    }
    return true;
  }

  getPointerPosition(event)
  {
    const container = this.container;
    let rect = container.getBoundingClientRect();
    const pointerPosition = new THREE.Vector2();
    pointerPosition.x = event.clientX - rect.left;
    pointerPosition.y = event.clientY - rect.top;

    return pointerPosition;
  }

  addService(service, group, save = true)
  {
    if (group === undefined)
    {
      console.warn("group is mandatory.");
      return;
    }

    if (this.services[group] === undefined)
    {
      this.services[group] = {};
    }
    this.services[group][service.name] = service;
    if (save) this.saveServices(group);
  }

  removeService(service, group, save = true)
  {
    if (this.services[group])
    {
      delete this.services[group][service.name];
      if (save) this.saveServices(group);
    }
  }

  saveServices(group)
  {
    let data = [];
    let serviceGroup = this.services[group];
    for (let name in serviceGroup)
    {
      let service = serviceGroup[name];
      data.push(
      {
        className : service.constructor.name,
        parameters: service.getParameters()
      });
    }
    let json = JSON.stringify(data);
    this.setup.setItem("services." + group, json);
    console.info("save services." + group + ": ", data);
  }

  restoreServices(group)
  {
    let json = this.setup.getItem("services." + group);
    if (json)
    {
      let array = JSON.parse(json);
      for (let i = 0; i < array.length; i++)
      {
        let entry = array[i];
        let className = entry.className;
        let parameters = entry.parameters;
        let serviceClass = ServiceManager.classes[className];
        if (serviceClass)
        {
          let service = new serviceClass(parameters);
          this.addService(service, group, false);
        }
        else console.warn("Service " + className + " not restored.");
      }
    }
  }

  addTool(tool)
  {
    if (!this.tools[tool.name])
    {
      this.tools[tool.name] = tool;

      var toolEvent = {type : "added", tool : tool};
      this.notifyEventListeners("tool", toolEvent);
    }
  }

  removeTool(tool)
  {
    if (this.tool === tool) return;

    if (this.tools[tool.name])
    {
      delete this.tools[tool.name];

      var toolEvent = {type : "removed", tool : tool};
      this.notifyEventListeners("tool", toolEvent);
    }
  }

  useTool(tool)
  {
    if (typeof tool === "string")
    {
      tool = this.tools[tool];
    }

    if (tool === undefined) tool = null;

    let toolEvent;
    if (tool && tool.immediate)
    {
      tool.execute();
      toolEvent = {type : "executed", tool : tool};
      this.notifyEventListeners("tool", toolEvent);
    }
    else
    {
      if (this.tool === tool) return; // already active

      if (this.tool !== null)
      {
        this.tool.deactivate();
        toolEvent = {type : "deactivated", tool : this.tool};
        this.notifyEventListeners("tool", toolEvent);
      }
      this.tool = tool;
      if (tool)
      {
        tool.activate();
        toolEvent = {type: "activated", tool: tool};
        this.notifyEventListeners("tool", toolEvent);
      }
    }
  }

  addObject(object, parent = null,
    attach = false, select = false, source = this)
  {
    if (!(object instanceof THREE.Object3D)) return;

    const scene = this.scene;

    if (parent === null)
    {
      parent = this.selection.object || this.baseObject;
      while (parent !== scene)
      {
        if (parent.type === "Object3D" || parent.type === "Group")
        {
          break;
        }
        else
        {
          parent = parent.parent;
        }
      }
    }

    if (parent === scene)
    {
      parent = this.baseObject;
    }

    if (attach)
    {
      parent.attach(object);
    }
    else
    {
      parent.add(object);
    }
    object.updateMatrix();

    let addEvent =
    {
      type : "added",
      object : object,
      parent: parent,
      source : source
    };
    this.notifyEventListeners("scene", addEvent);

    if (select)
    {
      this.selection.set(object);
    }
    return object;
  }

  removeObject(object, source = this)
  {
    if (!(object instanceof THREE.Object3D))
    {
      object = this.selection.object;
    }
    if (object && object !== this.baseObject && object !== this.scene)
    {
      this.stopControllers(object);

      let parent = object.parent;
      if (parent)
      {
        parent.remove(object);
        ObjectUtils.dispose(object);
      }
      let removeEvent =
      {
        type : "removed",
        object : object,
        parent : parent,
        source : source
      };
      this.notifyEventListeners("scene", removeEvent);

      this.selection.remove(object); // TODO: unselect child objects
    }
  }

  /**
   * Adds a Line and/or a Points object inside the application.overlay group.
   *
   * @param vertices {Vector3[]}: the Line/Points vertices represented in global CS.
   * @param isLineSegments {boolean}: when true the vertices represent segments
   *        of two points. When false vertices represent a sequence of connected points.
   * @param lineMaterial {LineMaterial}: the Line object material.
   *        If lineMaterial is null no Line object will be created.
   * @param pointsMaterial {PointsMaterial} : the Points object material.
   *        If pointsMaterial is null no Points object will be created.
   * @param group {Group}: the optional group to add the objects to.
   *        When null, the created objects will the added to the overlay group.
   */
  addOverlay(vertices, isLineSegments,
    lineMaterial = null, pointsMaterial = null, group = null)
  {
    let line = null;
    let points = null;

    if (vertices.length > 0)
    {
      let geometry = new THREE.BufferGeometry();

      let firstPoint = vertices[0];
      let offsetVector = GeometryUtils.getOffsetVectorForFloat32(firstPoint);
      if (offsetVector)
      {
        let transformedVertices = [];
        for (let vertex of vertices)
        {
          let transformedVertex = new THREE.Vector3();
          transformedVertex.copy(vertex);
          transformedVertices.push(transformedVertex);
        }
        GeometryUtils.offsetRings(offsetVector, transformedVertices);
        geometry.setFromPoints(transformedVertices);
      }
      else
      {
        geometry.setFromPoints(vertices);
      }

      if (lineMaterial && vertices.length >= 2)
      {
        if (isLineSegments)
        {
          line = new THREE.LineSegments(geometry, lineMaterial);
        }
        else
        {
          line = new THREE.Line(geometry, lineMaterial);
        }
        line.raycast = function(){};
        if (offsetVector)
        {
          line.position.add(offsetVector);
          line.updateMatrix();
        }
        if (group) group.add(line);
        else this.overlays.add(line);
      }

      if (pointsMaterial)
      {
        points = new THREE.Points(geometry, pointsMaterial);
        points.raycast = function(){};
        if (offsetVector)
        {
          points.position.add(offsetVector);
          points.updateMatrix();
        }
        if (group) group.add(points);
        else this.overlays.add(points);
      }

      if (group && group.parent !== this.overlays)
      {
        this.overlays.add(group);
      }
    }
    return { line, points };
  }

  copyObjects()
  {
    let copyObjects = this.selection.roots;
    copyObjects = copyObjects.filter(
      root => root !== this.scene && root.parent !== this.scene);
    this._copyObjects = copyObjects;
    this._cutObjects = [];
    if (copyObjects.length > 0)
    {
      let copyEvent =
      {
        type : "copy",
        objects : copyObjects,
        source : this
      };
      this.notifyEventListeners("scene", copyEvent);
    }
  }

  cutObjects()
  {
    let cutObjects = this.selection.roots;
    cutObjects = cutObjects.filter(
      root => root !== this.scene && root.parent !== this.scene);
    this._cutObjects = cutObjects;
    this._copyObjects = [];
    if (cutObjects.length > 0)
    {
      let cutEvent =
      {
        type : "cut",
        objects : cutObjects,
        source : this
      };
      this.notifyEventListeners("scene", cutEvent);
    }
  }

  pasteObjects(parent)
  {
    let copyObjects = this._copyObjects;
    let cutObjects = this._cutObjects;

    if (copyObjects.length === 0 && cutObjects.length === 0) return;

    if (parent === undefined)
    {
      if (copyObjects.length > 0)
      {
        if (this.selection.object === copyObjects[0])
        {
          parent = this.selection.object.parent;
        }
        else
        {
          parent = this.selection.object;
        }
      }
      else
      {
        parent = this.selection.object;
      }
    }

    let ancestor = parent;
    while (ancestor &&
           ancestor !== this.baseObject &&
           cutObjects.indexOf(ancestor) === -1)
    {
      ancestor = ancestor.parent;
    }

    if (ancestor === this.baseObject) // paste only under baseObject
    {
      let pastedObjects;

      if (copyObjects.length > 0)
      {
        pastedObjects = [];
        for (let copyObject of copyObjects)
        {
          let clonedObject = copyObject.clone(true);
          // set the parent object so that the attach method works correctly
          clonedObject.parent = copyObject.parent;
          parent.attach(clonedObject);
          clonedObject.updateMatrix();
          clonedObject.updateMatrixWorld();
          pastedObjects.push(clonedObject);
        }
        this._copyObjects = [];
      }
      else // cutObjects.length > 0
      {
        for (let cutObject of cutObjects)
        {
          let removeEvent =
          {
            type : "removed",
            object : cutObject,
            parent : cutObject.parent,
            source : this
          };
          parent.attach(cutObject);
          cutObject.updateMatrix();
          cutObject.updateMatrixWorld();
          this.notifyEventListeners("scene", removeEvent);
        }
        pastedObjects = cutObjects;
        this._cutObjects = [];
      }

      for (let pastedObject of pastedObjects)
      {
        let addEvent =
        {
          type : "added",
          object : pastedObject,
          parent : parent,
          source : this
        };
        this.notifyEventListeners("scene", addEvent);
      }

      let pasteEvent =
      {
        type: "pasted",
        objects: pastedObjects,
        source : this
      };

      this.notifyEventListeners("scene", pasteEvent);
      this.selection.set(...pastedObjects);
    }
  }

  notifyObjectsChanged(objects, source = this, type = "nodeChanged",
    properties = null) // properties: array of property names or null
  {
    if (objects instanceof THREE.Object3D)
    {
      objects = [objects];
    }

    let sceneEvent =
    {
      type: type,
      source : source,
      objects: objects,
      properties: properties
    };
    this.notifyEventListeners("scene", sceneEvent);
  }

  selectParentObject()
  {
    if (!this.selection.isEmpty())
    {
      let parent = this.selection.object.parent;
      if (parent)
      {
        this.selection.set(parent);
      }
    }
  }

  findObjects(objectExpression, baseObject = this.baseObject, nested = false)
  {
    let objects;

    if (objectExpression === null)
    {
      objects = this.selection.roots;
    }
    else if (objectExpression instanceof THREE.Object3D)
    {
      objects = [objectExpression];
    }
    else if (objectExpression instanceof Array)
    {
      // assume objectExpression is an Object3D array
      objects = objectExpression;
    }
    else if (typeof objectExpression === "string"
            || typeof objectExpression === "function")
    {
      const condition = ObjectUtils.createEvalFunction(objectExpression);
      objects = ObjectUtils.findObjects(condition, baseObject, nested);
    }
    else
    {
      objects = [];
    }

    return objects;
  }

  selectObjects(objectExpression, selectionMode)
  {
    const objects = this.findObjects(objectExpression);
    const selection = this.selection;

    if (selectionMode === Application.ADD_SELECTION_MODE)
    {
      selection.add(...objects);
    }
    else if (selectionMode === Application.REMOVE_SELECTION_MODE)
    {
      selection.remove(...objects);
    }
    else
    {
      selection.set(...objects);
    }
  }

  updateVisibility(objectExpression, visible)
  {
    let objects = this.findObjects(objectExpression);

    const changed = ObjectUtils.updateVisibility(objects, visible);

    this.notifyObjectsChanged(Array.from(changed));

    return changed;
  }

  updateStyle(objectExpression, edgesVisible, facesVisible)
  {
    let objects = this.findObjects(objectExpression);

    const changed = ObjectUtils.updateStyle(
      objects, edgesVisible, facesVisible);

    this.notifyObjectsChanged(Array.from(changed));

    return changed;
  }

  updateAppearance(objectExpression, appearance)
  {
    let objects = this.findObjects(objectExpression);

    const changed = ObjectUtils.updateAppearance(objects, appearance);

    this.notifyObjectsChanged(Array.from(changed));

    return changed;
  }

  updateObjects(objectExpression, updateFunction, recursive = false)
  {
    let objects = this.findObjects(objectExpression);

    const changed = ObjectUtils.updateObjects(
      objects, updateFunction, recursive);

    this.notifyObjectsChanged(Array.from(changed));

    return changed;
  }

  userSelectObjects(objects, event)
  {
    event.preventDefault();

    const selection = this.selection;
    if (event.shiftKey)
    {
      selection.add(...objects);
    }
    else if (event.ctrlKey)
    {
      selection.remove(...objects);
    }
    else
    {
      if (this.selectionMode === Application.ADD_SELECTION_MODE)
      {
        selection.add(...objects);
      }
      else if (this.selectionMode === Application.REMOVE_SELECTION_MODE)
      {
        selection.remove(...objects);
      }
      else
      {
        selection.set(...objects);
      }
    }
  }

  initControllers(object)
  {
    this.handleControllers(controller => controller.init(this), object);
  }

  startControllers(object)
  {
    const set = new Set();
    this.handleControllers(controller =>
    { controller.start(); set.add(controller.object); }, object);
    const objects = Array.from(set);
    this.notifyObjectsChanged(objects, this);
  }

  stopControllers(object)
  {
    const set = new Set();
    this.handleControllers(controller =>
    { controller.stop(); set.add(controller.object); }, object);
    const objects = Array.from(set);
    this.notifyObjectsChanged(objects, this);
  }

  handleControllers(handler, object)
  {
    if (object === undefined) object = this.scene;

    object.traverse(obj =>
    {
      let objectControllers = obj.controllers;
      if (objectControllers)
      {
        for (let name in objectControllers)
        {
          let controller = objectControllers[name];
          handler(controller);
        }
      }
    });
  }

  createController(controllerClass = null, object = null, name = null)
  {
    if (controllerClass === null) return;

    if (object === null)
    {
      object = this.baseObject;
    }
    if (name === null || name.trim().length === 0)
    {
      let count = object.controllers ?
        Object.keys(object.controllers).length : 0;
      name = "ctr_" + count;
    }
    let controller = new controllerClass(object, name);
    if (object.controllers === undefined)
    {
      object.controllers = {};
    }
    object.controllers[name] = controller;

    controller.init(this);

    this.notifyObjectsChanged(object);

    return controller;
  }

  evaluateFormulas()
  {
    const updatedObjects = Formula.updateTree(this.scene);

    console.info("Objects updated by formulas", updatedObjects);

    if (updatedObjects.length > 0)
    {
      this.notifyObjectsChanged(updatedObjects);
    }
  }

  rebuild()
  {
    const baseObject = this.baseObject;

    const built = [];
    ObjectBuilder.markAndBuild(baseObject, built);
    console.info("Objects rebuilt", built);

    if (built.length > 0)
    {
      let sceneEvent = {type: "structureChanged", objects: built,
        source : ObjectBuilder};
      this.notifyEventListeners("scene", sceneEvent);

      this.updateSelection();
    }
  }

  updateCameraAspectRatio()
  {
    var camera = this.camera;
    var container = this.container;
    var aspect = container.clientWidth / container.clientHeight;
    ObjectUtils.updateCameraAspectRatio(camera, aspect);
  }

  activateCamera(camera)
  {
    this.camera = camera;
    this.updateCameraAspectRatio();

    const changeEvent = {type: "cameraActivated", object: camera,
      source : this};
    this.notifyEventListeners("scene", changeEvent);
    this.updateSelection();
  }

  onResize()
  {
    this.updateCameraAspectRatio();
    const container = this.container;
    const renderer = this.renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    const cssRenderer = this.cssRenderer;
    cssRenderer.setSize(container.clientWidth, container.clientHeight);
    if (this.composer)
    {
      this.composer.setSize(container.clientWidth, container.clientHeight);
    }
    this.repaint();
  }

  createPanel(title, position, className)
  {
    const panel = new Panel(this);

    if (title) panel.title = title;
    if (position) panel.position = position;
    if (className) panel.setClassName(className);

    this.panelManager.addPanel(panel);

    return panel;
  }

  loadModules()
  {
    let modulePaths;

    this.loadedModules = [];

    const modulesParam = this.params.modules;
    if (modulesParam)
    {
      modulePaths = modulesParam.split(",");
    }
    else
    {
      modulePaths = ["base", "bim", "gis"];
    }
    modulePaths.reverse();

    const loadNextModule = () =>
    {
      if (modulePaths.length > 0)
      {
        let modulePath = modulePaths.pop();

        if (!ModuleLoader.isAbsolutePath(modulePath))
        {
          modulePath = "modules/" + modulePath;
        }

        ModuleLoader.load(modulePath).then(
          module =>
          {
            try
            {
              module.load(this);
              this.loadedModules.push(modulePath);
              console.info(`module ${modulePath} completed.`);
            }
            catch (ex)
            {
              console.error(ex);
              console.error(`module ${modulePath} failed: ${ex}`);
            }
          },
          error =>
          {
            console.error(`module ${modulePath} failed: ${error}`);
          }).finally(() => loadNextModule());
      }
      else
      {
        this.hideLogo();
        this.loadModelFromUrl();
      };
    };
    loadNextModule();
  }

  showLogo()
  {
    this.logoPanel.classList.add("visible");
    this.logoPanel.classList.remove("hidden");
  }

  hideLogo()
  {
    this.logoPanel.classList.add("hidden");
    this.logoPanel.classList.remove("visible");
  }

  enterPresentationMode()
  {
    this.headerElem.style.display = "none";
    this.toolBarElem.style.display = "none";
    this.container.style.top = "0px";
    this.panelManager.updateLayout();
    this.onResize();
  }

  exitPresentationMode()
  {
    this.headerElem.style.display = "";
    this.toolBarElem.style.display = "";
    this.container.style.top = "";
    this.panelManager.updateLayout();
    this.onResize();
  }

  async loadSplashContent(url, element)
  {
    const response = await fetch(url);
    const content = await response.text();
    element.innerHTML = content;
  }

  fullscreen()
  {
    if (document.body.requestFullscreen)
    {
      // chrome & firefox
      document.body.requestFullscreen();
    }
    else if (document.body.webkitRequestFullscreen)
    {
      // safari
      document.body.webkitRequestFullscreen();
    }
  }

  loadModelFromUrl()
  {
    const params = this.params;
    const url = params["url"];
    if (url === undefined) return;

    const splash = this.params["splash"];
    if (splash)
    {
      this.progressBar.element.classList.add("splash");
    }

    const application = this;
    const intent =
    {
      url : url,
      onProgress : data =>
      {
        application.progressBar.progress = data.progress;
        application.progressBar.message = data.message;
      },
      onCompleted : object =>
      {
        application.progressBar.element.classList.remove("splash");
        application.addObject(object);
        application.progressBar.visible = false;
        application.initControllers(object);
        application.initTasks();
      },
      onError : error =>
      {
        application.progressBar.element.classList.remove("splash");
        application.progressBar.visible = false;
        MessageDialog.create("ERROR", error)
          .setClassName("error")
          .setI18N(application.i18n).show();
      },
      options : { units : application.setup.units }
    };
    application.progressBar.message = "Loading file...";
    application.progressBar.progress = undefined;
    application.progressBar.visible = true;

    const auth = params["auth"];
    if (auth === "Basic")
    {
      let dialog = new LoginDialog(application);
      dialog.login = (username, password) =>
      {
        intent.basicAuthCredentials =
        { "username" : username, "password" : password };
        IOManager.load(intent);
      };
      dialog.onCancel = () =>
      {
        dialog.hide();
        application.progressBar.visible = false;
      };
      dialog.show();
    }
    else
    {
      IOManager.load(intent); // async load
    }
  }

  initTasks()
  {
    const params = this.params;
    const toolName = params["tool"];
    if (toolName)
    {
      let tool = this.tools[toolName];
      if (tool)
      {
        this.useTool(tool);
      }
    }
    else
    {
      const scriptPath = params["script"];
      if (scriptPath)
      {
        const request = new XMLHttpRequest();
        request.open('GET', scriptPath, true);
        request.onload = () =>
        {
          console.info(request.status);
          if (request.status === 200)
          {
            const scriptCode = request.responseText;
            const dialog = new ScriptDialog(this);
            dialog.scriptName = "init_script";
            dialog.scriptCode = scriptCode;
            let error = dialog.run();
            if (error)
            {
              dialog.show();
            }
          }
          else
          {
            let message = WebUtils.getHttpStatusMessage(request.status);
            MessageDialog.create("ERROR", "Can't open script: " + message +
              " (HTTP " + request.status + ")")
              .setClassName("error")
              .setI18N(this.i18n).show();
          }
        };
        request.send();
      }
    }
  }
}

export { Application };


