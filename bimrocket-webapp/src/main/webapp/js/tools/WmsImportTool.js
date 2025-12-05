/**
 * WMSImportTool.js
 *
 * @author nexus
 */

import { Tool } from "./Tool.js";
import { Dialog } from "../ui/Dialog.js";
import { WMSController } from "../controllers/WMSController.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import * as THREE from "three";
import { I18N } from "../i18n/I18N.js";

class WMSImportTool extends Tool
{
    constructor(application, options)
    {
        super(application);
        this.name = "wmsImport";
        this.label = "tool.wms_import.label";
        this.help = "tool.wms_import.help";
        this.className = "wmsImport";
        this.immediate = false;
        
        this.wmsConfigs = 
        {
            "icgc_orto_div_proxy":
            {
                label: "ICGC - Divisions + Orto + Espais Naturals",
                url: "https://geoserver.nexusgeografics.com/geoserver/bimrocket/wms",
                layer: "icgc_orto_demo",
                crs: "EPSG:3857"
            },
            "icgc_topo":
            {
                label: "ICGC - Topogràfic gris",
                url: "https://geoserveis.icgc.cat/icc_mapesmultibase/noutm/wms/service",
                layer: "topogris",
                crs: "EPSG:3857"
            },
            "icgc_orto":
            {
                label: "ICGC - Ortofoto",
                url: "https://geoserveis.icgc.cat/icc_mapesmultibase/noutm/wms/service",
                layer: "orto",
                crs: "EPSG:3857"
            },
            "icgc_geologic":
            {
                label: "ICGC - Divisions administratives 3857",
                url: "https://geoserveis.icgc.cat/servei/catalunya/divisions-administratives/wms/service",
                layer: "divisions_administratives_capsdemunicipi_capcomarca,divisions_administratives_capsdemunicipi_capmunicipi,divisions_administratives_municipis_5000,divisions_administratives_municipis_50000,divisions_administratives_municipis_100000,divisions_administratives_municipis_250000,divisions_administratives_comarques_5000,divisions_administratives_comarques_50000,divisions_administratives_comarques_100000,divisions_administratives_comarques_250000,divisions_administratives_comarques_500000,divisions_administratives_comarques_1000000",
                crs: "EPSG:3857"
            },
            "bcn_mtm":
            {
                label: "GeoBCN - MTM 3857",
                url: "https://geo.bcn.cat/mapproxy/service",
                layer: "MTM",
                crs: "EPSG:3857"
            },
            "icgc_geologic2":
            {
                label: "ICGC - Divisions administratives 25831",
                url: "https://geoserveis.icgc.cat/servei/catalunya/divisions-administratives/wms/service",
                layer: "divisions_administratives_capsdemunicipi_capcomarca,divisions_administratives_capsdemunicipi_capmunicipi,divisions_administratives_municipis_5000,divisions_administratives_municipis_50000,divisions_administratives_municipis_100000,divisions_administratives_municipis_250000,divisions_administratives_comarques_5000,divisions_administratives_comarques_50000,divisions_administratives_comarques_100000,divisions_administratives_comarques_250000,divisions_administratives_comarques_500000,divisions_administratives_comarques_1000000",
                crs: "EPSG:25831"
            }
        };
        
        this.dialog = this.createDialog();
        this.setOptions(options);
        application.addTool(this);
    }

    activate()
    { 
        super.activate();
        this.dialog.show(); 
    }

    deactivate()
    { 
        super.deactivate();
        this.dialog.hide();
    }

    createDialog()
    {
        const dialog = new Dialog("tool.wms_import.title");
        dialog.onHide = () => this.application.useTool(null);
        dialog.setSize(400, 400);
        dialog.setI18N(this.application.i18n);

        const createLabeledInput = (labelText) => 
        {
            const container = document.createElement("div");
            container.style.marginTop = "10px";
            
            const label = document.createElement("label");
            I18N.set(label, "textContent", labelText);
            label.style.display = "block";
            label.style.marginBottom = "5px";
            
            const input = document.createElement("input");
            input.type = "text";
            input.style.width = "95%";
            input.style.padding = "8px";
            
            container.appendChild(label);
            container.appendChild(input);
            return { container, input };
        };

        const createCheckbox = (labelText, id) =>
        {
            const container = document.createElement("div");
            container.style.marginTop = "10px";
            container.style.display = "flex";
            container.style.alignItems = "center";
            
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = id;
            checkbox.style.marginRight = "8px";
            
            const label = document.createElement("label");
            I18N.set(label, "textContent", labelText);
            label.htmlFor = id;
            label.style.cursor = "pointer";
            
            container.appendChild(checkbox);
            container.appendChild(label);
            return { container, checkbox };
        };

        const selectContainer = document.createElement("div");
        selectContainer.style.marginTop = "10px";

        const selectLabel = document.createElement("label");
        I18N.set(selectLabel, "textContent", "tool.wms_import.select_config");
        selectLabel.style.display = "block";
        selectLabel.style.marginBottom = "5px";
        
        const configSelect = document.createElement("select");
        configSelect.style.width = "95%";
        configSelect.style.padding = "8px";

        selectContainer.appendChild(selectLabel);
        selectContainer.appendChild(configSelect);
        dialog.bodyElem.appendChild(selectContainer);

        // Create labeled inputs
        const { container: urlContainer, input: urlInput } = createLabeledInput("tool.wms_import.url");
        const { container: layersContainer, input: layersInput } = createLabeledInput("tool.wms_import.layer");
        const { container: crsContainer, input: crsInput } = createLabeledInput("tool.wms_import.crs");

        // Create checkbox
        const { container: mapboxContainer, checkbox: mapboxCheckbox } = createCheckbox("tool.wms_import.use_mapbox_height", "mapboxHeight");

        this.urlInput = urlInput;
        this.layersInput = layersInput;
        this.crsInput = crsInput;
        this.mapboxCheckbox = mapboxCheckbox;

        // Add options to select
        Object.entries(this.wmsConfigs).forEach(([key, config]) =>
        {
            const option = document.createElement("option");
            option.value = key;
            option.text = config.label;
            configSelect.appendChild(option);
        });

        // Add change event listener
        configSelect.addEventListener("change", () =>
        {
            const config = this.wmsConfigs[configSelect.value];
            urlInput.value = config.url;
            layersInput.value = config.layer;
            crsInput.value = config.crs;
        });

        // Add all elements to dialog
        dialog.bodyElem.appendChild(urlContainer);
        dialog.bodyElem.appendChild(layersContainer);
        dialog.bodyElem.appendChild(crsContainer);
        dialog.bodyElem.appendChild(mapboxContainer);

        configSelect.dispatchEvent(new Event("change"));

        dialog.addButton("import", "button.accept", () => this.addWMS());
        dialog.addButton("close", "button.close", () => this.closeDialog());
        
        return dialog;
    }

    addWMS()
    {
        this.cleanup();

        const url = this.urlInput.value;
        const layers = this.layersInput.value;
        const crs = this.crsInput.value;
        const useMapboxHeight = this.mapboxCheckbox.checked;
        const application = this.application;

        if (!url || !layers || !crs) {
            MessageDialog.create("ERROR", "message.wms_import_tool_fields_required").setI18N(application.i18n).show();
            return;
        }

        const wmsLayerGroup = new THREE.Group();
        wmsLayerGroup.name = "WMS Layer - " + layers;

        if (!wmsLayerGroup.controllers)
        {
            wmsLayerGroup.controllers = {};
        }

        const controller = new WMSController(wmsLayerGroup, "wms_controller");
        controller.url = url;
        controller.layers = layers;
        controller.crs = crs;
        controller.useMapboxHeight = useMapboxHeight;
        
        wmsLayerGroup.controllers["wms_controller"] = controller;
        
        this.wmsLayerGroup = wmsLayerGroup;
        this.wmsController = controller;

        application.addObject(this.wmsLayerGroup, application.baseObject);
        application.initControllers(this.wmsLayerGroup);
        this.application.useTool(null);
    }

    cleanup()
    {
        if (this.wmsLayerGroup)
        {
            if (this.wmsLayerGroup.parent)
            {
                const mapView = this.wmsLayerGroup.getObjectByProperty('isMapView', true);
                if (mapView) { mapView.dispose(); }
                this.application.removeObject(this.wmsLayerGroup, null, true);
            }
            this.wmsLayerGroup = null;
        }
        this.wmsController = null;
    }

    closeDialog()
    {
        this.application.useTool(null);
    }
}

export { WMSImportTool };