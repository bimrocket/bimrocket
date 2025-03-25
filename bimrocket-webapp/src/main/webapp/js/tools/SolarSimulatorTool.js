/*
 * SolarSimulatorTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Controls } from "../ui/Controls.js";
import { Application } from "../ui/Application.js";
import { I18N } from "../i18n/I18N.js";
import { Solid } from "../core/Solid.js";
import { BIMUtils } from "../utils/BIMUtils.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import "../lib/suncalc.js";
import * as THREE from "three";

class SolarSimulatorTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "solar_simulator";
    this.label = "tool.solar_simulator.label";
    this.className = "solar_simulator";
    this.setOptions(options);
    application.addTool(this);

    this.target = new THREE.Object3D();
    this.target.name = "Target";

    this.resizeObverser = new ResizeObserver(() => this.onResize());

    this.simulationGroup = new THREE.Group();
    this.simulationGroup.name = "SolarSimulation";

    this.surfacesGroup = new THREE.Group();
    this.surfacesGroup.name = "Surfaces";

    this.edgeMaterial = null;
    this.surfaceMaterial = null;
    this.shadowMaterial = null;
    this.sunMaterial = null;

    this._onPointerDown = (event) => this.onPointerDown(event);
    this._onSceneChanged = (event) => this.onSceneChanged(event);

    this.createPanel();
  }

  createPanel()
  {
    const application = this.application;

    this.panel = application.createPanel(this.label, "left", "panel_solar_sim");
    this.panel.minimumHeight = 200;

    this.panel.onShow = () =>
    {
      application.addEventListener("scene", this._onSceneChanged);
      this.resizeObverser.observe(this.panel.element);
    };

    this.panel.onHide = () =>
    {
      application.removeEventListener("scene", this._onSceneChanged);
      this.cancel();
      application.useTool(null);
      this.resizeObverser.unobserve(this.panel.element);
    };

    this.selectPositionButton = Controls.addButton(this.panel.bodyElem,
      "solar_position", "button.select_position", () => application.useTool(this));

    this.helpElem = document.createElement("div");
    I18N.set(this.helpElem, "textContent", "tool.solar_simulator.select_position");
    this.helpElem.style.margin = "4px";
    this.panel.bodyElem.appendChild(this.helpElem);

    let lon = 2.045;
    let lat = 41.380;

    this.lonElem = Controls.addNumberField(this.panel.bodyElem,
      "solar_lon", "label.longitude", lon);
    this.lonElem.step = 0.01;
    this.lonElem.style.margin = "4px";
    this.lonElem.style.width = "80px";

    this.latElem = Controls.addNumberField(this.panel.bodyElem,
      "solar_lon", "label.latitude", lat);
    this.latElem.step = 0.01;
    this.latElem.style.margin = "4px";
    this.latElem.style.width = "80px";

    const date = new Date();
    let isoDate = date.toISOString().substring(0, 10);

    this.dateElem = Controls.addDateField(this.panel.bodyElem,
      "solar_date", "label.date", isoDate);
    this.dateElem.style.margin = "4px";

    this.timeGraph = new TimeGraph(this, this.panel.bodyElem);

    this.lonElem.addEventListener("input", () => this.update());
    this.latElem.addEventListener("input", () => this.update());
    this.dateElem.addEventListener("change", () => this.update());

    const setup = this.application.setup;

    this.shadowsCheckBox = Controls.addCheckBoxField(this.panel.bodyElem,
      "solar_cast_shadows", "tool.solar_simulator.cast_shadows", false,
      "flex align_items_center p_2");
    this.shadowsCheckBox.addEventListener("change",
      () => setup.shadowsEnabled = this.shadowsCheckBox.checked);

    this.intensityCheckBox = Controls.addCheckBoxField(this.panel.bodyElem,
      "solar_intensity", "tool.solar_simulator.adjust_intensity", true,
      "flex align_items_center p_2");
    this.intensityCheckBox.addEventListener("change", () => this.update());

    this.exposureElem = document.createElement("div");
    this.exposureElem.style.display = "none";
    this.panel.bodyElem.appendChild(this.exposureElem);

    this.surfaceHelpElem = document.createElement("div");
    this.surfaceHelpElem.style.margin = "4px";
    this.exposureElem.appendChild(this.surfaceHelpElem);
    I18N.set(this.surfaceHelpElem, "textContent", "tool.solar_simulator.select_surfaces");

    this.selectSurfacesButton = Controls.addButton(this.exposureElem,
      "solar_surcafaces", "button.select_surfaces", () => application.useTool(this));
    this.selectSurfacesButton.style.display = "none";

    this.surfaceCountElem = document.createElement("div");
    this.surfaceCountElem.className = "mt_4 mb_4";
    this.surfaceCountElem.style.margin = "4px";
    this.exposureElem.appendChild(this.surfaceCountElem);
    I18N.set(this.surfaceCountElem, "textContent", "message.selected_surfaces", 0);

    this.maxLengthElem = Controls.addNumberField(this.exposureElem,
      "solar_max_length", "label.max_length", 0.1);
    this.maxLengthElem.step = 0.01;
    this.maxLengthElem.min = 0;
    this.maxLengthElem.style.margin = "4px";
    this.maxLengthElem.style.width = "80px";
    I18N.set(this.maxLengthElem.previousSibling, "title", "tool.solar_simulator.max_length_info");

    this.maxAreaElem = Controls.addNumberField(this.exposureElem,
      "solar_max_area", "label.max_area", 0.0001);
    this.maxAreaElem.step = 0.0001;
    this.maxAreaElem.min = 0;
    this.maxAreaElem.style.margin = "4px";
    this.maxAreaElem.style.width = "80px";
    I18N.set(this.maxAreaElem.previousSibling, "title", "tool.solar_simulator.max_area_info");

    this.startExposureButton = Controls.addButton(this.exposureElem,
      "solar_exposure", "button.exposure", () => this.startExposure());
    this.startExposureButton.style.display = "";

    this.stopExposureButton = Controls.addButton(this.exposureElem,
      "solar_exposure", "button.stop", () => this.stopExposure());
    this.stopExposureButton.style.display = "none";

    this.cancelButton = Controls.addButton(this.exposureElem,
      "solar_cancel", "button.cancel", () =>
      { this.cancel(); application.useTool(this); });

    this.timeGraph.setTime(date);
  }

  activate()
  {
    const application = this.application;
    const container = this.application.container;
    this.shadowsCheckBox.checked = application.setup.shadowsEnabled;
    container.addEventListener("pointerdown", this._onPointerDown);

    this.panel.visible = true;
    this.panel.minimized = false;

    this.helpElem.style.display = "";
    this.surfaceHelpElem.style.display = "";
    this.selectPositionButton.style.display = "none";
    this.selectSurfacesButton.style.display = "none";
  }

  deactivate()
  {
    const application = this.application;
    const container = application.container;
    container.removeEventListener("pointerdown", this._onPointerDown);

    this.surfaceHelpElem.style.display = "none";
    if (!this.target.parent)
    {
      this.helpElem.style.display = "none";
      this.selectPositionButton.style.display = "";
    }
    this.selectSurfacesButton.style.display = "";
  }

  onPointerDown(event)
  {
    const application = this.application;
    if (!application.isCanvasEvent(event)) return;

    const pointerPosition = application.getPointerPosition(event);
    let intersect = this.intersect(pointerPosition, application.baseObject);
    if (intersect)
    {
      if (this.target.parent === null)
      {
        this.application.overlays.add(this.target);
        this.startExposureButton.disabled = true;
        this.exposureElem.style.display = "";

        let object = intersect.object;
        let geolocation = BIMUtils.getGeolocation(object);

        if (geolocation)
        {
          this.lonElem.value = geolocation.longitude;
          this.latElem.value = geolocation.latitude;
        }

        this.target.position.copy(intersect.point);
        this.target.updateMatrix();
        this.update();
        I18N.set(this.helpElem, "textContent", "tool.solar_simulator.drag");
        application.i18n.update(this.helpElem);
      }
      else
      {
        let object = intersect.object;
        if (object.parent === this.surfacesGroup)
        {
          application.removeObject(object);
          this.startExposureButton.disabled =
            this.surfacesGroup.children.length === 0;
        }
        else
        {
          this.addSurface(intersect);
          this.startExposureButton.disabled = false;
        }
      }
    }
  }

  onSceneChanged(event)
  {
    if (event.type === "structureChanged")
    {
      if (event.objects[0] === this.application.scene)
      {
        this.cancel();
        this.helpElem.style.display = "none";
        this.selectPositionButton.style.display = "";
      }
    }
    else
    {
      const simulationGroup = this.simulationGroup;
      if (!simulationGroup.parent)
      {
        simulationGroup.clear();
      }

      const surfacesGroup = this.surfacesGroup;
      if (!surfacesGroup.parent)
      {
        surfacesGroup.clear();
      }

      if ((event.type === "added" || event.type === "removed") &&
          (event.object === simulationGroup ||
           event.object === surfacesGroup ||
           event.parent === surfacesGroup))
      {
        I18N.set(this.surfaceCountElem, "textContent", "message.selected_surfaces",
          this.surfacesGroup.children.length);
        this.application.i18n.update(this.surfaceCountElem);
      }
    }
  }

  intersect(pointerPosition, baseObject, recursive)
  {
    const application = this.application;
    const camera = application.camera;
    const container = application.container;
    const raycaster = new THREE.Raycaster();

    let pointercc = new THREE.Vector2();
    pointercc.x = (pointerPosition.x / container.clientWidth) * 2 - 1;
    pointercc.y = -(pointerPosition.y / container.clientHeight) * 2 + 1;

    raycaster.setFromCamera(pointercc, camera);
    raycaster.camera = camera;
    raycaster.params.Line.threshold = 0.1;

    let intersects = raycaster.intersectObjects([baseObject], recursive);

    if (intersects.length === 0) return null;

    let firstIntersect = null;
    let surfaceIntersect = null;
    for (let intersect of intersects)
    {
      if (application.clippingPlane === null ||
          application.clippingPlane.distanceToPoint(intersect.point) > 0)
      {
        if (this.isSelectableObject(intersect.object))
        {
          if (firstIntersect === null)
          {
            firstIntersect = intersect;
          }

          if (intersect.object.parent === this.surfacesGroup)
          {
            surfaceIntersect = intersect;
            break;
          }
        }
      }
    }
    if (firstIntersect === null)
    {
      return null;
    }
    else if (surfaceIntersect === null)
    {
      return firstIntersect;
    }
    else
    {
      const delta = surfaceIntersect.distance - firstIntersect.distance;
      return delta < 0.01 ? surfaceIntersect : firstIntersect;
    }
  }

  onResize()
  {
    this.timeGraph.render();
  }

  update()
  {
    this.placeSun();
    this.timeGraph.render();
  }

  placeSun()
  {
    if (this.target.parent === null) return;

    const targetPosition = this.target.position;

    const application = this.application;
    const timeGraph = this.timeGraph;
    const MathUtils = THREE.MathUtils;
    const scene = application.scene;
    const sunLight = this.getSunLight();
    sunLight.target = this.target;
    application.selection.set(sunLight);

    const hemisphereLight = this.getHemisphereLight();

    let longitude = parseFloat(this.lonElem.value);
    let latitude = parseFloat(this.latElem.value);

    let date = this.getDate();

    const times = SunCalc.getTimes(date, latitude, longitude);
    timeGraph.times = times;
    const pos = SunCalc.getPosition(date, latitude, longitude);
    const srPos = SunCalc.getPosition(times.sunrise, latitude, longitude);
    const ssPos = SunCalc.getPosition(times.sunset, latitude, longitude);

    const solarElevation = pos.altitude;
    const solarAzimuth = pos.azimuth + Math.PI;

    const radius = 100;
    const base = Math.cos(solarElevation) * radius;
    const x = Math.cos(0.5 * Math.PI - solarAzimuth) * base;
    const y = Math.sin(0.5 * Math.PI - solarAzimuth) * base;
    const z = Math.sin(solarElevation) * radius;

    const sunPosition = sunLight.position;
    sunPosition.x = targetPosition.x + x;
    sunPosition.y = targetPosition.y + y;
    sunPosition.z = targetPosition.z + z;
    sunLight.updateMatrix();
    sunLight.visible = solarElevation > 0;

    if (this.intensityCheckBox.checked)
    {
      // calculate intensity of lights depending on solarElevation
      const intensity = Math.max(0.5 + 2.5 * Math.sin(solarElevation), 0.5);
      sunLight.intensity = intensity;
      hemisphereLight.intensity = intensity;
    }

    application.notifyObjectsChanged([this.target, sunLight, hemisphereLight]);

    timeGraph.elevationInDegrees = MathUtils.radToDeg(solarElevation);
    timeGraph.azimuthInDegrees = (MathUtils.radToDeg(solarAzimuth) + 360) % 360;
    timeGraph.sunriseElevationInDegrees = MathUtils.radToDeg(srPos.altitude);
    timeGraph.sunsetElevationInDegrees = MathUtils.radToDeg(ssPos.altitude);
  }

  startExposure()
  {
    const sunLight = this.getSunLight();
    if (!sunLight) return;

    const application = this.application;
    const progressBar = application.progressBar;

    const sunDirection = new THREE.Vector3();
    sunDirection.subVectors(sunLight.position, this.target.position);
    sunDirection.normalize();

    const shadowGenerator =
      new ShadowGenerator(application.scene, sunDirection);
    shadowGenerator.maxLength = parseFloat(this.maxLengthElem.value);
    shadowGenerator.maxArea = parseFloat(this.maxAreaElem.value);

    this.shadowGenerator = shadowGenerator;

    const surfacesGroup = this.surfacesGroup;
    for (let surface of surfacesGroup.children)
    {
      const array = surface.geometry.getAttribute("position").array;
      for (let i = 0; i < array.length; i += 9)
      {
        const x1 = array[i];
        const y1 = array[i + 1];
        const z1 = array[i + 2];
        const p1 = new THREE.Vector3(x1, y1, z1);
        p1.applyMatrix4(surface.matrixWorld);

        const x2 = array[i + 3];
        const y2 = array[i + 4];
        const z2 = array[i + 5];
        const p2 = new THREE.Vector3(x2, y2, z2);
        p2.applyMatrix4(surface.matrixWorld);

        const x3 = array[i + 6];
        const y3 = array[i + 7];
        const z3 = array[i + 8];
        const p3 = new THREE.Vector3(x3, y3, z3);
        p3.applyMatrix4(surface.matrixWorld);
        shadowGenerator.addTriangle(p1, p2, p3);
      }
    }

    shadowGenerator.onProgress = (message, progress) =>
    {
      progressBar.message = message;
      progressBar.progress = progress;
    };

    shadowGenerator.onComplete = () =>
    {
      progressBar.visible = false;
      progressBar.progress = undefined;
      progressBar.message = "";

      this.startExposureButton.style.display = "";
      this.stopExposureButton.style.display = "none";

      if (shadowGenerator.interrupted) return;

      const simulationGroup = this.simulationGroup;
      for (let child of simulationGroup.children)
      {
        if (child !== this.surfacesGroup)
        {
          child.visible = false;
          application.notifyObjectsChanged(child);
        }
      }

      const exposureGroup = new THREE.Group();
      exposureGroup.name = "Exposure-" + this.getDate().toISOString();
      exposureGroup.userData = shadowGenerator.getStatistics();

      const shadowEdgesGeometry = shadowGenerator.getEdgeGeometry();
      const shadowLines = new THREE.LineSegments(shadowEdgesGeometry, this.getEdgeMaterial());
      shadowLines.name = "ShadowEdges";
      shadowLines.position.sub(application.baseObject.position);
      shadowLines.updateMatrix();
      shadowLines.visible = false;
      shadowLines.raycast = function(){};
      exposureGroup.add(shadowLines);

      const sunEdgesGeometry = shadowGenerator.getEdgeGeometry(false);
      const sunLines = new THREE.LineSegments(sunEdgesGeometry, this.getEdgeMaterial());
      sunLines.name = "SunEdges";
      sunLines.position.sub(application.baseObject.position);
      sunLines.updateMatrix();
      sunLines.visible = false;
      sunLines.raycast = function(){};
      exposureGroup.add(sunLines);

      const shadowGeometry = shadowGenerator.getShadowGeometry();
      const shadowMesh = new THREE.Mesh(shadowGeometry, this.getShadowMaterial());
      shadowMesh.position.sub(application.baseObject.position);
      shadowMesh.name = "Shadow";
      shadowMesh.updateMatrix();
      shadowMesh.raycast = function(){};
      exposureGroup.add(shadowMesh);

      const sunGeometry = shadowGenerator.getShadowGeometry(false);
      const sunMesh = new THREE.Mesh(sunGeometry, this.getSunMaterial());
      sunMesh.position.sub(application.baseObject.position);
      sunMesh.name = "Sun";
      sunMesh.updateMatrix();
      sunMesh.raycast = function(){};
      exposureGroup.add(sunMesh);

      this.application.addObject(exposureGroup, simulationGroup);
    };

    progressBar.visible = true;
    progressBar.progress = undefined;

    this.startExposureButton.style.display = "none";
    this.stopExposureButton.style.display = "";

    shadowGenerator.start();
  }

  stopExposure()
  {
    const shadowGenerator = this.shadowGenerator;
    if (shadowGenerator)
    {
      shadowGenerator.stop();
      this.shadowGenerator = null;
    }
  }

  cancel()
  {
    this.stopExposure();

    const application = this.application;
    const scene = application.scene;
    const hemisphereLight = this.getHemisphereLight();
    const sunLight = this.getSunLight();
    sunLight.target = scene;
    sunLight.position.set(20, 20, 80);
    sunLight.updateMatrix();
    this.target.removeFromParent();

    hemisphereLight.intensity = 3;
    sunLight.intensity = 3;

    application.notifyObjectsChanged([this.target, sunLight, hemisphereLight]);
    application.selection.clear();

    this.exposureElem.style.display = "none";

    this.timeGraph.render();
    I18N.set(this.helpElem, "textContent", "tool.solar_simulator.select_position");
    application.i18n.update(this.helpElem);

    const simulationGroup = this.simulationGroup;
    if (simulationGroup.parent)
    {
      application.removeObject(simulationGroup);
      simulationGroup.clear();
    }

    const surfacesGroup = this.surfacesGroup;
    surfacesGroup.clear();
  }

  addSurface(intersect)
  {
    const object = intersect.object;
    if (object instanceof Solid)
    {
      const application = this.application;
      const point = intersect.point;
      const normal = intersect.normal.clone();
      const matrixWorld = object.matrixWorld;

      const geometry = this.getSurfaceGeometry(object.geometry, normal);
      if (!geometry) return;

      const mesh = new THREE.Mesh(geometry, this.getSurfaceMaterial());
      matrixWorld.decompose(mesh.position, mesh.rotation, mesh.scale);
      mesh.position.sub(application.baseObject.position);
      mesh.receiveShadow = true;
      mesh.name = "Surface-" + mesh.id;
      mesh.updateMatrix();

      const simulationGroup = this.simulationGroup;
      const surfacesGroup = this.surfacesGroup;
      simulationGroup.visible = true;
      surfacesGroup.visible = true;

      if (simulationGroup.parent === null)
      {
        ObjectUtils.dispose(simulationGroup);
        simulationGroup.clear();
        application.addObject(simulationGroup, application.baseObject);
      }

      if (surfacesGroup.parent === null)
      {
        ObjectUtils.dispose(surfacesGroup);
        surfacesGroup.clear();
        application.addObject(surfacesGroup, simulationGroup);
      }

      application.addObject(mesh, surfacesGroup);
    }
  }

  getEdgeMaterial()
  {
    if (!this.edgeMaterial)
    {
      this.edgeMaterial = new THREE.LineBasicMaterial(
        { color: 0x0, linewidth: 1 });
    }
    return this.edgeMaterial;
  }

  getSurfaceMaterial()
  {
    if (!this.surfaceMaterial)
    {
      this.surfaceMaterial = new THREE.MeshPhongMaterial({ color : 0x8080ff });
      this.surfaceMaterial.name = "surface";
      this.surfaceMaterial.polygonOffset = true;
      this.surfaceMaterial.polygonOffsetUnits = -1;
      this.surfaceMaterial.side = 2;
    }
    return this.surfaceMaterial;
  }

  getShadowMaterial()
  {
    if (!this.shadowMaterial)
    {
      this.shadowMaterial = new THREE.MeshPhongMaterial({ color : 0x606060 });
      this.shadowMaterial.name = "shadow";
      this.shadowMaterial.polygonOffset = true;
      this.shadowMaterial.polygonOffsetUnits = -3;
      this.shadowMaterial.side = 2;
    }
    return this.shadowMaterial;
  }

  getSunMaterial()
  {
    if (!this.sunMaterial)
    {
      this.sunMaterial = new THREE.MeshPhongMaterial({ color : 0xffff00 });
      this.sunMaterial.name = "sun";
      this.sunMaterial.polygonOffset = true;
      this.sunMaterial.polygonOffsetUnits = -3;
      this.sunMaterial.side = 2;
    }
    return this.sunMaterial;
  }

  getSurfaceGeometry(geometry, normal)
  {
    const bufferGeometry = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const factor = 0.8;

    for (let face of geometry.faces)
    {
      if (face.normal === null) face.updateNormal();

      if (face.normal.dot(normal) > factor)
      {
        let triangles = face.getTriangles();
        for (let triangle of triangles)
        {
          for (let i = 0; i < 3; i++)
          {
            let vertex = geometry.vertices[triangle[i]];
            positions.push(vertex.x, vertex.y, vertex.z);
            normals.push(normal.x, normal.y, normal.z);
          }
        }
      }
    }
    if (positions.length < 3) return null;

    bufferGeometry.setAttribute('position',
      new THREE.Float32BufferAttribute(positions, 3));
    bufferGeometry.setAttribute('normal',
      new THREE.Float32BufferAttribute(normals, 3));
    bufferGeometry.setIndex(null);
    return bufferGeometry;
  }

  getDate()
  {
    let sdate = this.dateElem.value;

    let n = new Date(0,0);
    n.setSeconds(this.timeGraph.time * 60 * 60);
    let stime = n.toTimeString().slice(0, 8);

    let dateTime = sdate + "T" + stime;

    return new Date(Date.parse(dateTime));
  }

  getDateAt0()
  {
    let sdate = this.dateElem.value;
    let dateTime = sdate + "T00:00:00";
    return new Date(Date.parse(dateTime));
  }

  getHemisphereLight()
  {
    const children = this.application.scene.children;
    for (let child of children)
    {
      if (child instanceof THREE.HemisphereLight) return child;
    }
    return null;
  }

  getSunLight()
  {
    const children = this.application.scene.children;
    for (let child of children)
    {
      if (child instanceof THREE.DirectionalLight) return child;
    }
    return null;
  }
}

class TimeGraph
{
  constructor(tool, parent)
  {
    this.tool = tool;

    let drag = false;
    this.time = 0; // 0..24
    this.times = null; // CalcSun object
    this.transform = null;

    this.azimuthInDegrees = 0; // 0..360
    this.elevationInDegrees = 0; // -90..90
    this.sunriseElevationInDegrees = 0;
    this.sunsetElevationInDegrees = 0;

    const canvas = document.createElement("canvas");
    canvas.style.border = "1px solid gray";
    parent.appendChild(canvas);

    this.canvas = canvas;

    canvas.addEventListener("pointerdown", event =>
      {
        const distance = Math.abs(event.offsetX - this.getXFromTime());
        if (event.pointerType === "mouse" || distance < 20)
        {
          drag = true;
          this.setTimeFromX(event.offsetX);
        }
      });
    canvas.addEventListener("pointerup", () =>
      {
        drag = false;
      });
    canvas.addEventListener("pointermove", event =>
      {
        if (drag)
        {
          this.setTimeFromX(event.offsetX);
        }
      });
    canvas.addEventListener("pointerleave", () =>
      {
        drag = false;
      });
    canvas.addEventListener("contextmenu", event =>
      {
        event.preventDefault();
      });
  }

  setTime(date)
  {
    this.time = this.getTimeFromDate(date);
  }

  getTimeFromDate(date)
  {
    return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  }

  getXFromTime()
  {
    const { getX } = this.getTransform();

    return getX(this.time);
  }

  setTimeFromX(offsetX)
  {
    const { getTimeFromX } = this.getTransform();

    let time = getTimeFromX(offsetX);
    if (time < 0) time = 0;
    else if (time > 24) time = 24;

    this.time = time;

    this.tool.update();
  }

  getTimeString(time)
  {
    const n = new Date(0, 0);
    n.setSeconds(time * 60 * 60);
    return n.toTimeString().slice(0, 5);
  }

  getTransform(update = false)
  {
    if (!this.transform || update)
    {
      const scaleWidth = 20;
      const scaleHeight = 20;
      const width = this.tool.panel.bodyElem.clientWidth - 10;
      const height = 140 + 2 * scaleHeight;
      const graphWidth = (width - 2 * scaleWidth);
      const graphHeight = (height - 2 * scaleHeight);

      this.transform = {
        width: width,
        height: height,

        graphWidth: graphWidth,
        graphHeight: graphHeight,

        scaleWidth: scaleWidth,
        scaleHeight: scaleHeight,

        getX: function(time) // time in hours 0..24
        {
          return scaleWidth + Math.round(graphWidth * time / 24);
        },

        getAzimuthY: function(azimuth) // azimuth in degrees (0..360)
        {
          return scaleHeight + graphHeight * azimuth / 360;
        },

        getElevationY: function(elevation) // elevation in degrees (-90..90)
        {
          return scaleHeight + graphHeight * (90 - elevation) / 180;
        },

        getTimeFromX: function(x) // canvas offset x
        {
          return 24 * (x - scaleWidth) / graphWidth;
        }
      };
    }
    return this.transform;
  }

  render()
  {
    let canvas = this.canvas;

    // adjust canvas size
    const application = this.tool.application;
    const i18n = application.i18n;

    const pixelRatio = window.devicePixelRatio || 1;
    const { width, height, graphWidth, graphHeight, scaleWidth, scaleHeight,
      getX, getAzimuthY, getElevationY } = this.getTransform(true);

    const ctx = canvas.getContext("2d");
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    ctx.clearRect(0, 0, width, height);
    ctx.scale(pixelRatio, pixelRatio);

    if (this.tool.target.parent === null) return;

    const MathUtils = THREE.MathUtils;

    const longitude = parseFloat(this.tool.lonElem.value);
    const latitude = parseFloat(this.tool.latElem.value);

    const gridColor = "#202020";
    const azimuthColor = "#2020ff";
    const elevationColor = "#ff2020";

    const graphMinX = getX(0);
    const graphMaxX = getX(24);
    const graphMinY = getElevationY(90);
    const graphMaxY = getElevationY(-90);
    const graph0Y = getElevationY(0);
    const graph12X = getX(12);

    // grid
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = gridColor;

    // graph rect
    ctx.strokeRect(graphMinX, graphMinY, graphWidth, graphHeight);

    // medium line
    ctx.beginPath();
    ctx.moveTo(graphMinX, graph0Y);
    ctx.lineTo(graphMaxX, graph0Y);
    ctx.stroke();

    // time scale
    ctx.font = "10 monospace";
    let step;
    if (width < 200) step = 4;
    else if (width < 400) step = 2;
    else step = 1;
    for (let h = 0; h <= 24; h++)
    {
      const hx = getX(h);
      ctx.beginPath();
      ctx.moveTo(hx, graphMaxY);
      ctx.lineTo(hx, graphMaxY + scaleHeight / 3);
      ctx.stroke();

      if (h % step === 0)
      {
        const sh = String(h);
        const tw = ctx.measureText(sh).width;
        ctx.fillText(String(h), hx - 0.5 * tw, graphMaxY + scaleHeight - 2);
      }
    }

    // azimuth scale
    ctx.font = "10px monospace";
    ctx.fillStyle = azimuthColor;
    ctx.fillText("0", scaleWidth / 2, graphMinY + 4);
    ctx.fillText("180", 0, graph0Y + 4);
    ctx.fillText("360", 0, graphMaxY + 4);

    // elevation scale
    ctx.fillStyle = elevationColor;
    ctx.fillText("+90", graphMaxX, graphMinY + 4);
    ctx.fillText(" 0", graphMaxX, graph0Y + 4);
    ctx.fillText("-90", graphMaxX, graphMaxY + 4);

    // azimuth & elevation
    const millisPerDay = 24 * 60 * 60 * 1000;
    const millisPerPixel = millisPerDay / graphWidth;
    const azimuthArray = [];
    const elevationArray = [];
    let millis = this.tool.getDateAt0().getTime();

    for (let i = 0; i < graphWidth; i++)
    {
      let pos = SunCalc.getPosition(new Date(millis), latitude, longitude);
      let azimuth = MathUtils.radToDeg(pos.azimuth + Math.PI);
      let elevation = MathUtils.radToDeg(pos.altitude);
      azimuthArray.push(getAzimuthY(azimuth));
      elevationArray.push(getElevationY(elevation));
      millis += millisPerPixel;
    }

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.strokeStyle = azimuthColor;
    ctx.moveTo(graphMinX, azimuthArray[0]);
    for (let i = 1; i < graphWidth; i++)
    {
      ctx.lineTo(graphMinX + i, azimuthArray[i]);
    }
    ctx.lineTo(graphMaxX, azimuthArray[graphWidth - 1]);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = elevationColor;
    ctx.moveTo(graphMinX, elevationArray[0]);
    for (let i = 1; i < graphWidth; i++)
    {
      ctx.lineTo(graphMinX + i, elevationArray[i]);
    }
    ctx.lineTo(graphMaxX, elevationArray[graphWidth - 1]);
    ctx.stroke();

    // sunset, sunrise
    const margin = 4;

    const sunriseTime = this.getTimeFromDate(this.times.sunriseEnd);
    const sunriseX = getX(sunriseTime);
    const sunriseY = getElevationY(this.sunriseElevationInDegrees);

    const sunsetTime = this.getTimeFromDate(this.times.sunsetStart);
    const sunsetX = getX(sunsetTime);
    const sunsetY = getElevationY(this.sunsetElevationInDegrees);

    ctx.fillStyle = "#404040";
    ctx.beginPath();
    ctx.arc(sunriseX, sunriseY, 2, 0, 2 * Math.PI);
    ctx.fill();
    const sunriseTimeString = this.getTimeString(sunriseTime);
    const sunriseWidth = ctx.measureText(sunriseTimeString).width;
    ctx.fillText(sunriseTimeString, sunriseX - 0.5 * sunriseWidth, sunriseY - margin);

    ctx.beginPath();
    ctx.arc(sunsetX, sunsetY, 2, 0, 2 * Math.PI);
    ctx.fill();
    const sunsetTimeString = this.getTimeString(sunsetTime);
    const sunsetWidth = ctx.measureText(sunriseTimeString).width;
    ctx.fillText(sunsetTimeString, sunsetX - 0.5 * sunsetWidth, sunsetY - margin);

    // selected time
    const timeX = getX(this.time);

    ctx.beginPath();
    ctx.strokeStyle = gridColor;
    ctx.moveTo(timeX, graphMinY);
    ctx.lineTo(timeX, height);
    ctx.stroke();

    const timeString = this.getTimeString(this.time);
    const fontSize = 13;
    ctx.fillStyle = gridColor;
    ctx.font = fontSize + "px monospace";
    const metrics = ctx.measureText(timeString);

    let tx = timeX + margin + metrics.width < graphMaxX ?
      timeX + margin :
      timeX - margin - metrics.width;

    ctx.fillText(timeString, tx, graphMaxY - margin);

    // intersections and text
    const radius = 4;
    ctx.font = "11px monospace";

    ctx.fillStyle = azimuthColor;
    ctx.beginPath();
    ctx.arc(timeX, getAzimuthY(this.azimuthInDegrees), radius, 0, 2 * Math.PI);
    ctx.fill();

    const azimuthText = i18n.get("label.azimuth") +
      this.azimuthInDegrees.toFixed(3) + "º";
    const azimuthTextWidth = ctx.measureText(azimuthText).width;

    ctx.fillText(azimuthText, graph12X - azimuthTextWidth - margin, graphMinY - margin);

    ctx.fillStyle = elevationColor;
    ctx.beginPath();
    ctx.arc(timeX, getElevationY(this.elevationInDegrees), radius, 0, 2 * Math.PI);
    ctx.fill();

    const elevationText = i18n.get("label.elevation") +
      this.elevationInDegrees.toFixed(3) + "º";

    ctx.fillText(elevationText, graph12X + margin, graphMinY - margin);
  }
}

class ShadowGenerator
{
  constructor(scene, sunDirection)
  {
    this.scene = scene;
    this.sunDirection = sunDirection;
    this.vertexMap = new Map();
    this.vertices = [];
    this.triangles = [];
    this.shadowVertices = []; // boolean array, true: shadow
    this.maxLength = 0.1;
    this.maxArea = 0.00001;
    this.stepMillis = 20;
    this.startMillis = 0;
    this.interrupted = false;
    this.areaCalculator = new THREE.Triangle();
    this.maxVertexCount = 15000000;
    this.totalArea = 0;
    this.nonDefinitiveArea = 0;
    this.processedArea = 0;
    this.lastShadowObject = null;
  }

  addTriangle(p1, p2, p3)
  {
    const i1 = this.addVertex(p1);
    const i2 = this.addVertex(p2);
    const i3 = this.addVertex(p3);

    const triangle = [i1, i2, i3];
    this.triangles.push(triangle);
    return triangle;
  }

  start()
  {
    this.step = 0;
    this.startMillis = Date.now();
    this.totalArea = this.getTotalArea();
    setTimeout(() => this.phase1(), 0);
  }

  stop()
  {
    this.interrupted = true;
  }

  onProgress(message, progress)
  {
  }

  onComplete(generator)
  {
  }

  addVertex(point)
  {
    const decimals = 5;
    const key = point.x.toFixed(decimals) + "/" +
                point.y.toFixed(decimals) + "/" +
                point.z.toFixed(decimals);
    let index = this.vertexMap.get(key);
    if (index === undefined)
    {
      index = this.vertices.length;
      this.vertices.push(point);
      this.shadowVertices.push(this.isPointShadowed(point));
      this.vertexMap.set(key, index);
    }
    return index;
  }

  isPointShadowed(point)
  {
    const sunDirection = this.sunDirection;
    const raycaster = new THREE.Raycaster(point, sunDirection, 0.001);

    if (this.lastShadowObject)
    {
      const intersects = [];
      this.lastShadowObject.raycast(raycaster, intersects);
      if (intersects.length > 0) return true;
    }

    return this.isObjectShadowed(this.scene, raycaster);
	}

  isObjectShadowed(object, raycaster)
  {
    if (!object.visible) return false;

    const intersects = [];
    object.raycast(raycaster, intersects);
    if (intersects.length > 0)
    {
      if (!(object instanceof THREE.Line)
          && object.material?.transparent === false)
      {
        this.lastShadowObject = object;
        return true;
      }
    }

    for (let child of object.children)
    {
      if (this.isObjectShadowed(child, raycaster)) return true;
    }
    return false;
  }


  phase1()
  {
    if (this.interrupted)
    {
      this.onComplete(this);
    }
    else
    {
      const triangles = this.triangles;
      if (this.step < triangles.length && this.maxLength > 0)
      {
        const t0 = Date.now();
        while (Date.now() - t0 < this.stepMillis && this.step < triangles.length)
        {
          this.phase1Step();
        }
        let message = "Phase-1, triangles: " + Math.round(triangles.length / 1000) + "K";
        this.onProgress(message,
          100 * this.processedArea / this.totalArea);
        setTimeout(() => this.phase1(), 0);
      }
      else
      {
        this.step = 0;
        this.processedArea = 0;
        setTimeout(() => this.phase2(), 0);
      }
    }
  }

  phase2()
  {
    if (this.interrupted)
    {
      this.onComplete(this);
    }
    else
    {
      const triangles = this.triangles;
      if (this.step < triangles.length && this.maxArea > 0)
      {
        const t0 = Date.now();
        while (Date.now() - t0 < this.stepMillis && this.step < triangles.length)
        {
          this.phase2Step();
        }
        let message = "Phase-2, triangles: " + Math.round(triangles.length / 1000) + "K";
        this.onProgress(message,
          100 * this.processedArea / this.nonDefinitiveArea);
        setTimeout(() => this.phase2(), 0);
      }
      else
      {
        this.endMillis = Date.now();
        this.onComplete(this);
      }
    }
  }

  phase1Step()
  {
    const maxLength = this.maxLength;
    const triangles = this.triangles;
    const areaCalculator = this.areaCalculator;
    let triangle = triangles[this.step];

    const i1 = triangle[0];
    const i2 = triangle[1];
    const i3 = triangle[2];

    const p1 = this.vertices[i1];
    const p2 = this.vertices[i2];
    const p3 = this.vertices[i3];

    const d12 = p1.distanceTo(p2);
    const d13 = p1.distanceTo(p3);
    const d23 = p2.distanceTo(p3);
    if (d12 > maxLength || d13 > maxLength || d23 > maxLength)
    {
      const dmax = Math.max(d12, Math.max(d13, d23));
      if (d12 === dmax)
      {
        const p12 = new THREE.Vector3();
        p12.copy(p1).add(p2).multiplyScalar(0.5);
        const i12 = this.addVertex(p12);
        triangle[0] = i1;
        triangle[1] = i12;
        triangle[2] = i3;
        triangles.push([i12, i2, i3]);
      }
      else if (d13 === dmax)
      {
        const p13 = new THREE.Vector3();
        p13.copy(p1).add(p3).multiplyScalar(0.5);
        const i13 = this.addVertex(p13);
        triangle[0] = i1;
        triangle[1] = i2;
        triangle[2] = i13;
        triangles.push([i2, i3, i13]);
      }
      else
      {
        const p23 = new THREE.Vector3();
        p23.copy(p2).add(p3).multiplyScalar(0.5);
        const i23 = this.addVertex(p23);
        triangle[0] = i1;
        triangle[1] = i2;
        triangle[2] = i23;
        triangles.push([i1, i23, i3]);
      }
    }
    else // completed triangle
    {
      areaCalculator.a.copy(p1);
      areaCalculator.b.copy(p2);
      areaCalculator.c.copy(p3);
      const area = areaCalculator.getArea();
      this.processedArea += area;
      if (this.isDefinitiveTriangle(triangle))
      {
        triangle.push(1); // definitive
      }
      else
      {
        this.nonDefinitiveArea += area;
        triangle.push(0); // non definitive
      }
      this.step++;
    }
  }

  phase2Step()
  {
    const maxArea = this.maxArea;
    const triangles = this.triangles;
    const areaCalculator = this.areaCalculator;
    let triangle = triangles[this.step];

    const i1 = triangle[0];
    const i2 = triangle[1];
    const i3 = triangle[2];
    const definitive = triangle[3]; // 0: no, 1: yes, undefined: new

    const s1 = this.shadowVertices[i1];
    const s2 = this.shadowVertices[i2];
    const s3 = this.shadowVertices[i3];

    const p1 = this.vertices[i1];
    const p2 = this.vertices[i2];
    const p3 = this.vertices[i3];

    areaCalculator.a.copy(p1);
    areaCalculator.b.copy(p2);
    areaCalculator.c.copy(p3);

    const area = areaCalculator.getArea();
    if (area < maxArea)
    {
      if (definitive !== 1)
      {
        this.processedArea += area;
      }
      this.step++;
      return;
    }

    if (s1 === s2 && s2 === s3)
    {
      if (definitive !== 1)
      {
        this.processedArea += area;
      }
      this.step++;
      return;
    }

    const d12 = p1.distanceTo(p2);
    const d13 = p1.distanceTo(p3);
    const d23 = p2.distanceTo(p3);

    if (s1 === s2 && s1 !== s3)
    {
      const pm = new THREE.Vector3();
      let im;
      if (d13 > d23)
      {
        pm.copy(p1).add(p3).multiplyScalar(0.5);
        im = this.addVertex(pm);
        triangles.push([im, i2, i3]);
      }
      else
      {
        pm.copy(p2).add(p3).multiplyScalar(0.5);
        im = this.addVertex(pm);
        triangles.push([i1, im, i3]);
      }
      triangle[0] = i1;
      triangle[1] = i2;
      triangle[2] = im;
    }
    else if (s1 === s3 && s1 !== s2)
    {
      const pm = new THREE.Vector3();
      let im;
      if (d12 > d23)
      {
        pm.copy(p1).add(p2).multiplyScalar(0.5);
        im = this.addVertex(pm);
        triangles.push([im, i2, i3]);
      }
      else
      {
        pm.copy(p2).add(p3).multiplyScalar(0.5);
        im = this.addVertex(pm);
        triangles.push([i1, i2, im]);
      }
      triangle[0] = i1;
      triangle[1] = im;
      triangle[2] = i3;
    }
    else if (s2 === s3 && s1 !== s2)
    {
      const pm = new THREE.Vector3();
      let im;
      if (d12 > d13)
      {
        pm.copy(p1).add(p2).multiplyScalar(0.5);
        im = this.addVertex(pm);
        triangles.push([i1, im, i3]);
      }
      else
      {
        pm.copy(p1).add(p3).multiplyScalar(0.5);
        im = this.addVertex(pm);
        triangles.push([i1, i2, im]);
      }
      triangle[0] = im;
      triangle[1] = i2;
      triangle[2] = i3;
    }
  }

  getTotalArea()
  {
    const vertices = this.vertices;

    let totalArea = 0;
    const areaCalculator = this.areaCalculator;
    for (let triangle of this.triangles)
    {
      areaCalculator.a.copy(vertices[triangle[0]]);
      areaCalculator.b.copy(vertices[triangle[1]]);
      areaCalculator.c.copy(vertices[triangle[2]]);
      totalArea += areaCalculator.getArea();
    }
    return totalArea;
  }

  getStatistics()
  {
    const vertices = this.vertices;

    let totalArea = 0;
    let shadowArea = 0;
    let sunArea = 0;
    let totalTriangleCount = this.triangles.length;
    let shadowTriangleCount = 0;
    let sunTriangleCount = 0;

    const areaCalculator = this.areaCalculator;
    for (let triangle of this.triangles)
    {
      areaCalculator.a.copy(vertices[triangle[0]]);
      areaCalculator.b.copy(vertices[triangle[1]]);
      areaCalculator.c.copy(vertices[triangle[2]]);
      let area = areaCalculator.getArea();
      totalArea += area;
      if (this.isShadowTriangle(triangle))
      {
        shadowArea += area;
        shadowTriangleCount++;
      }
      else
      {
        sunArea += area;
        sunTriangleCount++;
      }
    }
    const computeTime = (this.endMillis - this.startMillis) / 1000;

    return {
      totalArea : totalArea,
      totalTriangleCount : totalTriangleCount,

      shadowArea : shadowArea,
      shadowAreaPercentage : 100 * shadowArea / totalArea,
      shadowTriangleCount : shadowTriangleCount,

      sunArea : sunArea,
      sunAreaPercentage : 100 * sunArea / totalArea,
      sunTriangleCount : sunTriangleCount,

      computeTime : computeTime
    };
  }

  getEdgeGeometry(shadow = true)
  {
    const vertices = this.vertices;
    const edgeVertices = [];

    for (let triangle of this.triangles)
    {
      if (this.isShadowTriangle(triangle, shadow))
      {
        for (let i = 0; i < 3; i++)
        {
          edgeVertices.push(vertices[triangle[i]]);
          edgeVertices.push(vertices[triangle[(i + 1) % 3]]);
        }
        if (edgeVertices.length > this.maxVertexCount) break;
      }
    }
    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setFromPoints(edgeVertices);
    bufferGeometry.setIndex(null);
    return bufferGeometry;
  }

  getShadowGeometry(shadow = true)
  {
    const vertices = this.vertices;
    const selectedVertices = [];

    for (let triangle of this.triangles)
    {
      if (this.isShadowTriangle(triangle, shadow))
      {
        for (let i = 0; i < 3; i++)
        {
          selectedVertices.push(vertices[triangle[i]]);
        }
        if (selectedVertices.length > this.maxVertexCount) break;
      }
    }
    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setFromPoints(selectedVertices);
    bufferGeometry.setIndex(null);
    bufferGeometry.computeVertexNormals();
    return bufferGeometry;
  }

  isDefinitiveTriangle(triangle)
  {
    const shadowVertices = this.shadowVertices;

    let shadowCount = 0;
    for (let i = 0; i < 3; i++)
    {
      if (shadowVertices[triangle[i]]) shadowCount++;
    }
    return shadowCount === 0 || shadowCount === 3;
  }

  isShadowTriangle(triangle, shadow = true)
  {
    const shadowVertices = this.shadowVertices;

    let shadowCount = 0;
    for (let i = 0; i < 3; i++)
    {
      if (shadowVertices[triangle[i]]) shadowCount++;
    }
    return shadow && shadowCount >= 2 || !shadow && shadowCount <= 1;
  }
}


export { SolarSimulatorTool };
