/**
 * WMSImportTool.js
 *
 * @author nexus
 */

import { Tool } from "./Tool.js";
import { Dialog } from "../ui/Dialog.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import * as THREE from "three";
import { MapView, MapBoxProvider, DebugProvider } from "geo-three";
import proj4 from 'proj4';

// Projecció Web Mercator (EPSG:3857)
proj4.defs("EPSG:3857", "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs");

// Projecció UTM zona 31N (EPSG:25831)
proj4.defs("EPSG:25831", "+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

class MapboxTool extends Tool
{
  constructor(application)
  {
    super(application);
    this.name = "mapbox_import";
    this.label = "tool.mapbox_import.label";
    this.help = "tool.mapbox_import.help";
    this.className = "mapboxImport";
    this.immediate = true;

    this.dialog = this.createDialog();
    this.debugLayerGroup = null;
  }

  execute()
  {
    this.dialog.show();
  }

  cleanup()
  {
    if (this.debugLayerGroup)
    {
      const mapView = this.debugLayerGroup.getObjectByProperty("isMapView", true);
      if (mapView)
      {
        mapView.dispose();
      }
      this.application.removeObject(this.debugLayerGroup, null, true);
      this.debugLayerGroup = null;
    }
  }

  createDialog()
  {
    const dialog = new Dialog("Importar capa Mapbox");
    dialog.setSize(400, 300);
    dialog.setI18N(this.application.i18n);

    const container = document.createElement("div");
    container.style.marginTop = "10px";

    const label = document.createElement("label");
    label.textContent = "Mapbox API Key:";
    label.style.display = "block";
    label.style.marginBottom = "5px";

    const input = document.createElement("input");
    input.type = "text";
    input.style.width = "95%";
    input.style.padding = "8px";
    input.value = "pk.eyJ1IjoiYXZhbGxzIiwiYSI6ImNtaDkzMm40NDBhYWMyanIxbnVraGFqY2oifQ.iFeS28_97GcOTB5tUutR-Q";

    container.appendChild(label);
    container.appendChild(input);

    const debugContainer = document.createElement("div");
    debugContainer.style.marginTop = "15px";

    const debugCheck = document.createElement("input");
    debugCheck.type = "checkbox";
    debugCheck.id = "debugCheck";

    const debugLabel = document.createElement("label");
    debugLabel.htmlFor = "debugCheck";
    debugLabel.textContent = "Debug Layer";
    debugLabel.style.marginLeft = "5px";

    debugContainer.appendChild(debugCheck);
    debugContainer.appendChild(debugLabel);

    this.apiKeyInput = input;
    this.debugCheck = debugCheck;

    dialog.bodyElem.appendChild(container);
    dialog.bodyElem.appendChild(debugContainer);

    dialog.addButton("import", "button.accept", () => this.importMapbox());
    dialog.addButton("close", "button.close", () => this.closeDialog());

    return dialog;
  }

  importMapbox()
  {
    this.cleanup();

    const apiKey = this.apiKeyInput.value;

    if (!apiKey)
    {
      MessageDialog.create("ERROR", "La API Key de Mapbox és obligatòria.").show();
      return;
    }

    try
    {
      const debugLayer = this.debugCheck.checked;
      const application = this.application;
      const camera = application.camera;
      if (debugLayer)
      {
        const provider = new DebugProvider();
        const mapViewGeoThree = new MapView(MapView.PLANAR, provider, camera);
        mapViewGeoThree.name = "DebugView";

        this.debugLayerGroup = new THREE.Group();
        this.debugLayerGroup.name = "Debug Layer";
        this.debugLayerGroup.add(mapViewGeoThree);
        this.debugLayerGroup.rotation.x = Math.PI / 2;
        this.debugLayerGroup.rotation.y = 0;
        this.debugLayerGroup.position.set(253, 5668, -0.1);

        this.debugLayerGroup.updateMatrix();
        this.debugLayerGroup.updateMatrixWorld(true);
        application.addObject(this.debugLayerGroup, application.baseObject);
        application.notifyObjectsChanged(camera, this);

        this.closeDialog();
      }
      else
      {
        const vectorProvider = new MapBoxProvider
        (
          apiKey,
          "mapbox.satellite",
          MapBoxProvider.MAP_ID,
          "jpg70"
        );
        
       const heightProvider = new MapBoxProvider
        (
          apiKey,
          "mapbox.terrain-rgb",
          MapBoxProvider.MAP_ID,
          "pngraw"
        );

        const mapView = new MapView(MapView.HEIGHT, vectorProvider, heightProvider);
        mapView.name = "MapboxView";

        this.mapboxLayerGroup = new THREE.Group();
        this.mapboxLayerGroup.name = "Mapbox Layer";
        this.mapboxLayerGroup.add(mapView);

        this.mapboxLayerGroup.rotation.x = Math.PI / 2;
        this.mapboxLayerGroup.rotation.y = 0;

        this.mapboxLayerGroup.position.set(253, 5668, -2);

        this.mapboxLayerGroup.updateMatrix();
        this.mapboxLayerGroup.updateMatrixWorld(true);

        application.addObject(this.mapboxLayerGroup, application.baseObject);
        application.notifyObjectsChanged(camera, this);

        this.closeDialog();

      }
    }
    catch (err)
    {
      console.error("Error durant la importació Mapbox:", err);
      MessageDialog.create
        ("ERROR", "Error durant la importació: " + err.message)
          .setClassName("error")
          .setI18N(this.application.i18n)
          .show();
    }
  }

  closeDialog()
  {
    this.dialog.hide();
  }
}

export { MapboxTool };