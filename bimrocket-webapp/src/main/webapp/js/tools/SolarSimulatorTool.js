/*
 * SolarSimulatorTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Controls } from "../ui/Controls.js";
import { Application } from "../ui/Application.js";
import { I18N } from "../i18n/I18N.js";
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

    this.target = new THREE.Object3D();
    this.target.name = "target";

    this.time = 0;
    this.times = null; // sunrise, sunset, ... (Date)

    this.azimuthInDegrees = 0; // 0..360
    this.elevationInDegrees = 0; // -90..90
    this.sunriseElevationInDegrees = 0;
    this.sunsetElevationInDegrees = 0;

    this.resizeObverser = new ResizeObserver(() => this.onResize());

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left", "panel_solar_sim");
    this.panel.preferredHeight = 400;
    this.panel.minimumHeight = 300;

    this.panel.onHide = () => this.application.useTool(null);

    this.helpElem = document.createElement("div");
    I18N.set(this.helpElem, "textContent", "tool.solar_simulator.select");
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

    this.canvas = document.createElement("canvas");
    this.canvas.style.border = "1px solid gray";
    this.panel.bodyElem.appendChild(this.canvas);

    let drag = false;
    const canvas = this.canvas;
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

    this.lonElem.addEventListener("input", () => this.update());
    this.latElem.addEventListener("input", () => this.update());
    this.dateElem.addEventListener("change", () => this.update());

    this.intensityCheckBox = Controls.addCheckBoxField(this.panel.bodyElem,
      "solar_intensity", "tool.solar_simulator.adjust_intensity", true,
      "flex align_items_center p_2 text_center");
    this.intensityCheckBox.addEventListener("change", () => this.update());

    this.cancelButton = Controls.addButton(this.panel.bodyElem,
      "solar_cancel", "button.cancel", () => this.cancel());
    this.cancelButton.style.display = "none";

    this._onPointerDown = (event) => this.onPointerDown(event);

    this.setTime(date);
  }

  activate()
  {
    const application = this.application;
    const container = this.application.container;
    this.panel.visible = true;
    container.addEventListener("pointerdown", this._onPointerDown);
    this.resizeObverser.observe(this.panel.bodyElem);
  }

  deactivate()
  {
    const container = this.application.container;
    this.panel.visible = false;
    container.removeEventListener("pointerdown", this._onPointerDown);
    this.resizeObverser.unobserve(this.panel.bodyElem);
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
      this.update();
      I18N.set(this.helpElem, "textContent", "tool.solar_simulator.drag");
      application.i18n.update(this.helpElem);
    }
  }

  onResize()
  {
    this.renderGraph();
  }

  update()
  {
    this.placeSun();
    this.renderGraph();
  }

  placeSun()
  {
    if (this.target.parent === null) return;

    const point = this.target.position;

    const application = this.application;
    const MathUtils = THREE.MathUtils;
    const scene = application.scene;
    const sunLight = this.getSunLight();
    sunLight.target = this.target;
    application.selection.set(sunLight);

    const hemisphereLight = this.getHemisphereLight();

    let longitude = parseFloat(this.lonElem.value);
    let latitude = parseFloat(this.latElem.value);

    let date = this.getDate();

    this.times = SunCalc.getTimes(date, latitude, longitude);
    const pos = SunCalc.getPosition(date, latitude, longitude);
    const srPos = SunCalc.getPosition(this.times.sunrise, latitude, longitude);
    const ssPos = SunCalc.getPosition(this.times.sunset, latitude, longitude);

    const solarElevation = pos.altitude;
    const solarAzimuth = pos.azimuth + Math.PI;

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

    if (this.intensityCheckBox.checked)
    {
      // calculate intensity of lights depending on solarElevation
      const intensity = Math.max(0.5 + 2.5 * Math.sin(solarElevation), 0.5);
      sunLight.intensity = intensity;
      hemisphereLight.intensity = intensity;
    }

    application.notifyObjectsChanged([this.target, sunLight, hemisphereLight]);

    this.elevationInDegrees = MathUtils.radToDeg(solarElevation);
    this.azimuthInDegrees = (MathUtils.radToDeg(solarAzimuth) + 360) % 360;
    this.sunriseElevationInDegrees = MathUtils.radToDeg(srPos.altitude);
    this.sunsetElevationInDegrees = MathUtils.radToDeg(ssPos.altitude);
  }

  renderGraph()
  {
    let canvas = this.canvas;

    // adjust canvas size
    const application = this.application;
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

    if (this.target.parent === null) return;

    const MathUtils = THREE.MathUtils;

    const longitude = parseFloat(this.lonElem.value);
    const latitude = parseFloat(this.latElem.value);

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
    let millis = this.getDateAt0().getTime();

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

  cancel()
  {
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
    this.cancelButton.style.display = "none";
    this.renderGraph();
    I18N.set(this.helpElem, "textContent", "tool.solar_simulator.select");
    application.i18n.update(this.helpElem);
  }

  getTransform(update = false)
  {
    if (!this.transform || update)
    {
      const scaleWidth = 20;
      const scaleHeight = 20;
      const width = this.panel.bodyElem.clientWidth - 10;
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

  getDate()
  {
    let sdate = this.dateElem.value;

    let n = new Date(0,0);
    n.setSeconds(this.time * 60 * 60);
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

  setTime(date)
  {
    this.time = this.getTimeFromDate(date);
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

    this.update();
  }

  getTimeString(time)
  {
    const n = new Date(0, 0);
    n.setSeconds(time * 60 * 60);
    return n.toTimeString().slice(0, 5);
  }

  getTimeFromDate(date)
  {
    return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
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

export { SolarSimulatorTool };
