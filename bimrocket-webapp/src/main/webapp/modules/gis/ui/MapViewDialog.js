/*
 * MapViewDialog.js
 *
 * @author nexus
 */

import { Dialog } from "platform/ui/dialog/Dialog.js";
import { Controls } from "platform/ui/Controls.js";
import { MapViewController } from "../controllers/MapViewController.js";
import * as THREE from "three";

class MapViewDialog extends Dialog
{
  constructor(application)
  {
    super("gis|tool.map_view.label");
    this.application = application;
    this.setSize(400, 350);
    this.setI18N(application.i18n);
    this.setClassName("map_view_container");
    this.iconName = "gis|map-view";

    this.createUI();
  }

  createUI()
  {
    const bodyElem = this.bodyElem;
    bodyElem.innerHTML = "";
    bodyElem.style.padding = "10px";

    this.providerElem = Controls.addSelectField(bodyElem, "map_viewProvider",
      "gis|label.map_view.provider",
      [
        ["OpenStreetMapsProvider", "gis|option.map_view.openstreetmap"],
        ["GoogleMapsProvider", "gis|option.map_view.googlemaps"],
        ["BingMapsProvider", "gis|option.map_view.bingmaps"],
        ["MapBoxProvider", "gis|option.map_view.mapbox"],
        ["HereMapsProvider", "gis|option.map_view.heremaps"],
        ["MapTilerProvider", "gis|option.map_view.maptiler"],
        ["OpenMapTilesProvider", "gis|option.map_view.openmaptiles"],
        ["WMSProvider", "gis|option.map_view.wms"]
      ],
      "OpenStreetMapsProvider");

    this.providerElem.style.display = "flex";
    this.providerElem.style.flexDirection = "column";
    this.providerElem.style.width = "100%";
    this.providerElem.style.marginBottom = "6px";

    this.providerKeyElem = Controls.addTextField(bodyElem, "map_viewProviderKey",
      "gis|label.map_view.provider_key", "");
    this.providerKeyElem.spellcheck = false;
    this.providerKeyElem.parentNode.style.marginBottom = "6px";
    this.providerKeyElem.parentNode.style.display = "none";

    this.mapModeElem = Controls.addSelectField(bodyElem, "map_viewMapMode",
      "gis|label.map_view.map_mode",
      [
        ["PLANAR", "gis|option.map_view.planar"],
        ["SPHERICAL", "gis|option.map_view.spherical"],
        ["HEIGHT", "gis|option.map_view.height"],
        ["HEIGHT_SHADER", "gis|option.map_view.height_shader"],
        ["MARTINI", "gis|option.map_view.martini"]
      ],
      "PLANAR");
    this.mapModeElem.style.display = "flex";
    this.mapModeElem.style.flexDirection = "column";
    this.mapModeElem.style.width = "100%";
    this.mapModeElem.style.marginBottom = "6px";

    this.utmZoneElem = Controls.addTextField(bodyElem, "map_viewUtmZone",
      "gis|label.map_view.utm_zone", "31T");
    this.utmZoneElem.spellcheck = false;
    this.utmZoneElem.style.marginBottom = "6px";

    this.heightProviderKeyElem = Controls.addTextField(bodyElem,
      "map_viewHeightProviderKey", "gis|label.map_view.height_provider_key", "");
    this.heightProviderKeyElem.spellcheck = false;
    this.heightProviderKeyElem.parentNode.style.marginBottom = "6px";
    this.heightProviderKeyElem.parentNode.style.display = "none";

    this.wmsUrlElem = Controls.addTextField(bodyElem, "map_viewWmsUrl",
      "gis|label.map_view.wms_url", "");
    this.wmsUrlElem.spellcheck = false;
    this.wmsUrlElem.parentNode.style.marginBottom = "6px";
    this.wmsUrlElem.parentNode.style.display = "none";
    this.markRequired(this.wmsUrlElem);

     this.wmsLayerElem = Controls.addTextField(bodyElem, "map_viewWmsLayer",
      "gis|label.map_view.wms_layer", "");
    this.wmsLayerElem.spellcheck = false;
    this.wmsLayerElem.parentNode.style.marginBottom = "6px";
    this.wmsLayerElem.parentNode.style.display = "none";
    this.markRequired(this.wmsLayerElem);

    this.maxRequestsPerSecondElem = Controls.addTextField(bodyElem,
      "map_viewMaxRequestsPerSecond", "gis|label.map_view.max_requests_per_second", "20");
    this.maxRequestsPerSecondElem.spellcheck = false;
    this.maxRequestsPerSecondElem.type = "number";
    this.maxRequestsPerSecondElem.min = "1";
    this.maxRequestsPerSecondElem.parentElement.style.display = "flex";
    this.maxRequestsPerSecondElem.parentElement.style.flexDirection = "column";
    const maxRequestsPerSecondLabel = this.maxRequestsPerSecondElem.parentElement;
    maxRequestsPerSecondLabel.style.display = "flex";
    maxRequestsPerSecondLabel.style.width = "100%";
    this.maxRequestsPerSecondElem.style.marginBottom = "6px";

    this.acceptButton = this.addButton("accept", "button.accept",
      () => this.onAccept());
    this.cancelButton = this.addButton("cancel", "button.cancel",
      () => this.hide());

    this.providerElem.addEventListener("change", () =>
      this.updateProviderKeyVisibility());
    this.mapModeElem.addEventListener("change", () =>
      this.updateProviderKeyVisibility());
    this.wmsUrlElem.addEventListener("input", () =>
      this.updateAcceptButtonState());
    this.wmsLayerElem.addEventListener("input", () =>
      this.updateAcceptButtonState());
    this.updateProviderKeyVisibility();
    this.updateAcceptButtonState();
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
    const provider = this.providerElem.value;
    const isWMS = provider === "WMSProvider";

    if (isWMS)
    {
      const wmsUrlValue = this.wmsUrlElem.value.trim();
      const wmsLayerValue = this.wmsLayerElem.value.trim();
      this.acceptButton.disabled =
        wmsUrlValue.length === 0 || wmsLayerValue.length === 0;
    }
    else
    {
      this.acceptButton.disabled = false;
    }
  }

  parseUtmZone(value)
  {
    if (!value) return { utmZoneNumber: 0, utmZoneLetter: "" };

    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "0")
    {
      return { utmZoneNumber: 0, utmZoneLetter: "" };
    }

    const match = trimmed.match(/(\d+)([a-zA-Z]?)/);
    if (!match) return { utmZoneNumber: 0, utmZoneLetter: "" };

    const parsedNumber = Number.parseInt(match[1], 10);
    if (parsedNumber < 1 || parsedNumber > 60)
    {
      return { utmZoneNumber: 0, utmZoneLetter: "" };
    }

    const letter = (match[2] || "").toUpperCase();
    const utmZoneLetter =
      letter === "" || /^[A-Z]$/.test(letter) ? (letter || "N") : "N";

    return { utmZoneNumber: parsedNumber, utmZoneLetter };
  }

  buildProviderSetup(provider, providerKey, wmsUrl, wmsLayer)
  {
    if (provider === "WMSProvider")
    {
      return {
        baseUrl: wmsUrl || "https://geoserveis.icgc.cat/servei/catalunya/orto-territorial/wms",
        layers: wmsLayer || "ortofoto_gris_vigent",
        format: "image/png",
        transparent: true
      };
    }

    if (!providerKey)
    {
      return {};
    }

    if (provider === "MapBoxProvider")
    {
      return { apiToken: providerKey };
    }
    else if (provider === "GoogleMapsProvider")
    {
      return { apiKey: providerKey };
    }
    else if (provider === "HereMapsProvider")
    {
      return { appId: providerKey, appCode: providerKey };
    }
    else if (
        provider === "MapTilerProvider" ||
        provider === "BingMapsProvider" ||
        provider === "OpenMapTilesProvider"
      )
    {
      return { key: providerKey };
    }

    return {};
  }

  applyHeightProviderSetup(layerGroup, controllerName, providerKey)
  {
    const heightSetupName = controllerName + "_MapBoxHeightProvider_height";
    layerGroup.userData[heightSetupName] = {};
    if (providerKey)
    {
      layerGroup.userData[heightSetupName].apiToken = providerKey;
    }
  }

  initLayerGroup(provider)
  {
    const layerGroup = new THREE.Group();
    layerGroup.name = "Map View Layer - " + provider;
    layerGroup.userData = {};

    if (!layerGroup.controllers)
    {
      layerGroup.controllers = {};
    }

    return layerGroup;
  }

  configureController(controller, mapMode, utmZoneNumber, utmZoneLetter, useHeightProvider)
  {
    controller.mapMode = mapMode;
    controller.utmZoneNumber = utmZoneNumber;
    controller.utmZoneLetter = utmZoneLetter;

    if (useHeightProvider)
    {
      controller.heightProvider = "MapBoxHeightProvider";
    }
  }

  updateProviderKeyVisibility()
  {
    const provider = this.providerElem.value;
    const isWMS = provider === "WMSProvider";
    const requiresKey = [
      "GoogleMapsProvider",
      "MapBoxProvider",
      "HereMapsProvider",
      "MapTilerProvider",
      "OpenMapTilesProvider",
      "BingMapsProvider"
    ].includes(provider);

    this.providerKeyElem.parentNode.style.display =
      requiresKey ? "block" : "none";
    const heightModes = ["HEIGHT", "HEIGHT_SHADER", "MARTINI"];
    const heightModeEnabled = heightModes.includes(this.mapModeElem.value);
    this.heightProviderKeyElem.parentNode.style.display =
      heightModeEnabled ? "block" : "none";

    this.wmsUrlElem.parentNode.style.display = isWMS ? "block" : "none";
    this.wmsLayerElem.parentNode.style.display = isWMS ? "block" : "none";

    this.updateAcceptButtonState();
  }

  onAccept()
  {
    const application = this.application;
    const provider = this.providerElem.value;
    const mapMode = this.mapModeElem.value;
    const utmZoneValue = this.utmZoneElem.value;
    const useHeightProvider =
      ["HEIGHT", "HEIGHT_SHADER", "MARTINI"].includes(mapMode);
    const providerKey = this.providerKeyElem.value;
    const heightProviderKey = this.heightProviderKeyElem.value;
    const wmsUrl = this.wmsUrlElem.value.trim();
    const wmsLayer = this.wmsLayerElem.value.trim();
    const maxRequestsPerSecond = Number.parseInt(
      this.maxRequestsPerSecondElem.value, 10) || 20;

    const { utmZoneNumber, utmZoneLetter } = this.parseUtmZone(utmZoneValue);
    const layerGroup = this.initLayerGroup(provider);
    application.addObject(layerGroup, application.baseObject);

    const controllerName = "map_view_controller_" + Date.now();
    const setupName = controllerName + "_" + provider;
    layerGroup.userData[setupName] = this.buildProviderSetup(
      provider,
      providerKey,
      wmsUrl,
      wmsLayer
    );

    if (useHeightProvider)
    {
      this.applyHeightProviderSetup(layerGroup, controllerName, heightProviderKey);
    }

    const controller = new MapViewController(layerGroup, controllerName);

    controller.provider = provider;
    controller.maxRequestsPerSecond = maxRequestsPerSecond;
    this.configureController(
      controller,
      mapMode,
      utmZoneNumber,
      utmZoneLetter,
      useHeightProvider
    );

    layerGroup.controllers[controllerName] = controller;

    controller.init(application);
    controller.start();

    this.hide();
  }

}

export { MapViewDialog };
