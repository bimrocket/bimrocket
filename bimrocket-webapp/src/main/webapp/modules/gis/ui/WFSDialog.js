/*
 * WFSDialog.js
 *
 * @author nexus
 */

import { Dialog } from "platform/ui/dialog/Dialog.js";
import { Controls } from "platform/ui/Controls.js";
import { WFSController } from "../controllers/WFSController.js";
import { Solid } from "platform/core/Solid.js";
import { Extruder } from "platform/builders/Extruder.js";
import { Formula } from "platform/formula/Formula.js";
import * as THREE from "three";

class WFSDialog extends Dialog
{
  constructor(application)
  {
    super("gis|tool.wfs.label");
    this.application = application;
    this.setSize(400, 450);
    this.setI18N(application.i18n);
    this.setClassName("wfs_container");

    this.createUI();
  }

  createUI()
  {
    const bodyElem = this.bodyElem;
    bodyElem.innerHTML = "";
    bodyElem.style.padding = "10px";

    const groupElem = document.createElement("div");

    this.wfsTypeElem = Controls.addSelectField(groupElem, "wfsType",
      "gis|label.wfs.type",
      [["geojson", "gis|option.wfs.geojson"],
       ["gml2", "gis|option.wfs.gml2"],
       ["gml3", "gis|option.wfs.gml3"],
       ["gml32", "gis|option.wfs.gml32"]],
      "geojson");
    this.wfsTypeElem.style.display = "flex";
    this.wfsTypeElem.style.flexDirection = "column";
    this.wfsTypeElem.style.width = "100%";
    this.wfsTypeElem.style.marginBottom = "6px";

    bodyElem.appendChild(groupElem);

    this.urlElem = Controls.addTextField(bodyElem, "wfsUrl",
      "gis|label.wfs.url", "");
    this.urlElem.spellcheck = false;
    this.urlElem.style.marginBottom = "6px";
    this.markRequired(this.urlElem);

    this.layerNameElem = Controls.addTextField(bodyElem, "wfsLayerName",
      "gis|label.wfs.layer_name", "");
    this.layerNameElem.spellcheck = false;
    this.layerNameElem.style.marginBottom = "6px";
    this.markRequired(this.layerNameElem);

    this.limitDistanceElem = Controls.addTextField(bodyElem,
      "wfsLimitDistance", "gis|label.wfs.limit_distance", null);
    this.limitDistanceElem.spellcheck = false;
    this.limitDistanceElem.type = "number";
    this.limitDistanceElem.parentElement.style.display = "flex";
    this.limitDistanceElem.parentElement.style.flexDirection = "column";
    const limitDistanceLabel = this.limitDistanceElem.parentElement
      .querySelector("label");
    if (limitDistanceLabel)
    {
      limitDistanceLabel.style.display = "block";
      limitDistanceLabel.style.width = "100%";
    }
    this.limitDistanceElem.style.marginBottom = "6px";

    const limitDistanceNote = Controls.addText(bodyElem,
      "gis|label.wfs.limit_distance_help");
    limitDistanceNote.style.display = "block";
    limitDistanceNote.style.fontSize = "11px";
    limitDistanceNote.style.marginBottom = "10px";

    this.srsNameElem = Controls.addTextField(bodyElem, "wfsSrsName",
      "gis|label.wfs.srs_name", "");
    this.srsNameElem.spellcheck = false;
    this.srsNameElem.style.marginBottom = "6px";

    const srsNameNote = Controls.addText(bodyElem,
      "gis|label.wfs.srs_name_help");
    srsNameNote.style.display = "block";
    srsNameNote.style.fontSize = "11px";
    srsNameNote.style.marginBottom = "10px";

    this.extrusionElem = Controls.addCheckBoxField(bodyElem, "wfsExtrusion",
      "gis|label.wfs.extrusion", false, "report_name");

    this.extrusionDepthElem = Controls.addTextField(bodyElem, "wfsExtrusionDepth",
      "gis|label.wfs.extrusion_depth", "1");
    this.extrusionDepthElem.spellcheck = false;
    this.extrusionDepthElem.type = "number";
    this.extrusionDepthElem.parentElement.style.display = "flex";
    this.extrusionDepthElem.parentElement.style.flexDirection = "column";
    const extrusionDepthLabel = this.extrusionDepthElem.parentElement
      .querySelector("label");
    if (extrusionDepthLabel)
    {
      extrusionDepthLabel.style.display = "block";
      extrusionDepthLabel.style.width = "100%";
    }
    this.extrusionDepthGroupElem = this.extrusionDepthElem.parentNode;
    this.extrusionDepthGroupElem.style.display = "none";

    this.extrusionElem.addEventListener("change", () =>
    {
      this.extrusionDepthGroupElem.style.display =
        this.extrusionElem.checked ? "flex" : "none";
    });

    this.acceptButton = this.addButton("accept", "button.accept",
      () => this.onAccept());
    this.cancelButton = this.addButton("cancel", "button.cancel",
      () => this.hide());

    this.updateAcceptButtonState();
    this.urlElem.addEventListener("input", () =>
      this.updateAcceptButtonState());
    this.layerNameElem.addEventListener("input", () =>
      this.updateAcceptButtonState());
  }

  markRequired(inputElem)
  {
    const groupElem = inputElem.parentNode;
    if (!groupElem) return;

    const labelElem = groupElem.firstChild;
    if (!labelElem) return;

    labelElem.classList.add("required");
  }

  updateAcceptButtonState()
  {
    const urlValue = this.urlElem.value.trim();
    const layerValue = this.layerNameElem.value.trim();
    this.acceptButton.disabled =
      urlValue.length === 0 || layerValue.length === 0;
  }

  onAccept()
  {
    const application = this.application;
    const layerName = this.layerNameElem.value;
    const wfsType = this.wfsTypeElem.value;
    const srsName = this.srsNameElem.value;
    const extrusionEnabled = this.extrusionElem.checked;
    const url = this.urlElem.value;
    const limitDistanceValue = Number.parseFloat(this.limitDistanceElem.value);

    const layerGroup = new THREE.Group();
    layerGroup.name = layerName || "WFS Layer";
    application.addObject(layerGroup, application.baseObject);

    const controllerName = "wfs_controller_" + Date.now();
    const controller = application.createController(
      WFSController,
      layerGroup,
      controllerName
    );

    controller.layer = layerName;
    controller.url = url;
    controller.username = "";
    controller.password = "";
    switch (wfsType)
    {
      case "gml2":
        controller.format = "GML2";
        break;
      case "gml3":
        controller.format = "GML3";
        break;
      case "gml32":
        controller.format = "GML32";
        break;
      default:
        controller.format = "GeoJSON";
    }
    controller.srsName = srsName;
    controller.representationMode = WFSController.ADD_OBJECT_REPR_MODE;

    if (Number.isFinite(limitDistanceValue) && limitDistanceValue > 0)
    {
      const sites = application.findObjects($ => $("IFC", "ifcClassName") === "IfcSite");
      if (sites.length > 0)
      {
        let site = sites[0];
        let project = site.parent;
        let center = new THREE.Vector3(0, 0, 0);
        center.applyMatrix4(site.matrix).applyMatrix4(project.matrix);
        if (srsName !== "" && srsName !== undefined)
        {
          controller.srsName = srsName;
          controller.bbox =
          [
            center.x - limitDistanceValue,
            center.y - limitDistanceValue,
            center.x + limitDistanceValue,
            center.y + limitDistanceValue
          ].join(",");
          controller.bbox = `${controller.bbox},${srsName}`;
        }
        else
        {
          controller.bbox =
          [
            center.x - limitDistanceValue,
            center.y - limitDistanceValue,
            center.x + limitDistanceValue,
            center.y + limitDistanceValue
          ].join(",");
        }
      }
      else
      {
        console.warn("WFS: limit distance ignored (IfcSite not found).");
      }
    }

    const representation = new Solid();
    representation.name = WFSController.REPRESENTATION_NAME;
    representation.builder = new Extruder();

    let extrusionDepth = 0;
    if (extrusionEnabled)
    {
      const depthValue = Number.parseFloat(this.extrusionDepthElem.value);
      extrusionDepth = Number.isFinite(depthValue) && depthValue > 0
        ? depthValue : 1;
    }
    representation.builder.depth = extrusionDepth;
    Formula.create(
      representation,
      "material",
      "new THREE.MeshPhongMaterial({ color: 0x808080 })",
      false
    );

    application.addObject(representation, layerGroup);

    controller.start();

    this.hide();
  }
}

export { WFSDialog };
