/*
 * SolarSimulatorTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Controls } from "../ui/Controls.js";
import { Application } from "../ui/Application.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "three";

class SolarSimulatorTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "solar_simulator";
    this.label = "tool.solar_simulator.label";
    this.help = "tool.solar_simulator.help";
    this.className = "solar_simulator";
    this.setOptions(options);

    this.target = new THREE.Object3D();
    this.target.name = "target";

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 280;

    this.panel.onHide = () => this.application.useTool(null);

    const helpElem = document.createElement("div");
    I18N.set(helpElem, "textContent", this.help);
    helpElem.style.margin = "4px";
    this.panel.bodyElem.appendChild(helpElem);

    let lon = 2.045;
    let lat = 41.380;

    const date = new Date();
    let isoDate = date.toISOString().substring(0, 10);
    let time = date.getHours();

    this.dateElem = Controls.addDateField(this.panel.bodyElem, "solar_date", "label.date", isoDate);
    this.dateElem.style.margin = "4px";
    this.timeElem = Controls.addRangeField(this.panel.bodyElem, "solar_time", "label.time", 6, 22, 0.01);

    this.lonElem = Controls.addNumberField(this.panel.bodyElem, "solar_lon", "label.longitude", lon);
    this.lonElem.step = 0.01;
    this.lonElem.style.margin = "4px";
    this.lonElem.style.width = "80px";

    this.latElem = Controls.addNumberField(this.panel.bodyElem, "solar_lon", "label.latitude", lat);
    this.latElem.step = 0.01;
    this.latElem.style.margin = "4px";
    this.latElem.style.width = "80px";

    this.timeElem.formatValue = value => {
      let n = new Date(0,0);
      n.setSeconds(+value * 60 * 60);
      value = n.toTimeString().slice(0, 5);
      return value + "h";
    };

    this.timeElem.rangeValue = time;

    this.azimuthElem = document.createElement("div");
    this.panel.bodyElem.appendChild(this.azimuthElem);

    this.elevationElem = document.createElement("div");
    this.panel.bodyElem.appendChild(this.elevationElem);

    this.dateElem.addEventListener("change", () => this.placeSun());
    this.timeElem.addEventListener("input", () => this.placeSun());
    this.lonElem.addEventListener("change", () => this.placeSun());
    this.latElem.addEventListener("change", () => this.placeSun());

    this.cancelButton = Controls.addButton(this.panel.bodyElem,
      "solar_cancel", "button.cancel", () => this.cancel());
    this.cancelButton.style.display = "none";

    this._onPointerDown = (event) => this.onPointerDown(event);
  }

  activate()
  {
    const application = this.application;
    const container = this.application.container;
    this.panel.visible = true;
    container.addEventListener("pointerdown", this._onPointerDown);
  }

  deactivate()
  {
    const container = this.application.container;
    this.panel.visible = false;
    container.removeEventListener("pointerdown", this._onPointerDown);
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
        this.cancelButton.style.display = "";
      }
      this.target.position.copy(intersect.point);
      this.target.updateMatrix();
      this.placeSun();
    }
  }

  placeSun()
  {
    if (this.target.parent === null) return;

    const point = this.target.position;

    const application = this.application;
    const MathUtils = THREE.MathUtils;
    const scene = application.scene;
    const sunLight = scene.getObjectByName("SunLight");
    sunLight.target = this.target;
    application.selection.set(sunLight);

    let longitude = parseFloat(this.lonElem.value);
    let latitude = parseFloat(this.latElem.value);
    let sdate = this.dateElem.value;
    let time = this.timeElem.value;

    var n = new Date(0,0);
    n.setSeconds(+time * 60 * 60);
    time = n.toTimeString().slice(0, 8);

    let dateTime = sdate + "T" + time;

    let date = new Date(Date.parse(dateTime));

    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const declination = 23.44 * Math.sin(MathUtils.degToRad((360 / 365) * (dayOfYear - 81)));

    const timeInHours = date.getUTCHours() + date.getUTCMinutes() / 60;
    const solarTime = timeInHours + (4 * (longitude - 15)) / 60;
    const hourAngle = (solarTime - 12) * 15;

    const solarElevation = Math.asin(
      Math.sin(MathUtils.degToRad(latitude)) *
      Math.sin(MathUtils.degToRad(declination)) +
      Math.cos(MathUtils.degToRad(latitude)) *
      Math.cos(MathUtils.degToRad(declination)) *
      Math.cos(MathUtils.degToRad(hourAngle))
    );

    const solarAzimuth = Math.atan2(
      Math.sin(MathUtils.degToRad(hourAngle)),
      Math.cos(MathUtils.degToRad(hourAngle)) * Math.sin(MathUtils.degToRad(latitude)) -
      Math.tan(MathUtils.degToRad(declination)) * Math.cos(MathUtils.degToRad(latitude))
    ) - Math.PI;

    const radius = 100;
    const x = Math.cos(0.5 * Math.PI - solarAzimuth) * radius;
    const y = Math.sin(0.5 * Math.PI - solarAzimuth) * radius;
    const z = Math.sin(solarElevation) * radius;

    const sunPosition = sunLight.position;
    sunPosition.x = point.x + x;
    sunPosition.y = point.y + y;
    sunPosition.z = point.z + z;
    sunLight.updateMatrix();
    sunLight.visible = solarElevation > 0;

    application.notifyObjectsChanged([this.target, sunLight]);

    const elevationInDegrees = MathUtils.radToDeg(solarElevation);
    const azimuthInDegrees = (MathUtils.radToDeg(solarAzimuth) + 360) % 360;

    I18N.set(this.azimuthElem, "textContent", "label.azimuth", azimuthInDegrees.toFixed(3));
    I18N.set(this.elevationElem, "textContent", "label.elevation", elevationInDegrees.toFixed(3));
    application.i18n.update(this.azimuthElem);
    application.i18n.update(this.elevationElem);
  }

  cancel()
  {
    const application = this.application;
    const scene = application.scene;
    const sunLight = scene.getObjectByName("SunLight");
    sunLight.target = scene;
    sunLight.position.set(20, 20, 80);
    sunLight.updateMatrix();
    this.target.removeFromParent();
    application.notifyObjectsChanged([this.target, sunLight]);
    application.selection.clear();
    this.azimuthElem.textContent = "";
    this.elevationElem.textContent = "";
    this.cancelButton.style.display = "none";
  }
}

export { SolarSimulatorTool };
