/*
 * PaintTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
import { Controls } from "../ui/Controls.js";
import { Solid } from "../core/Solid.js";
import { InputDialog } from "../ui/InputDialog.js";
import * as THREE from "../lib/three.module.js";

class PaintTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "paint";
    this.label = "tool.paint.label";
    this.className = "paint";
    this.setOptions(options);

    this.createPanel();

    this.materials = new Map();
    this.sceneUuid = null;
  }

  createPanel()
  {
    const application = this.application;
    this.panel = this.application.createPanel(this.label, "left");

    this.materialListElem = Controls.addSelectField(this.panel.bodyElem,
      "materialList", "label.material_list");
    this.materialListElem.style.display = "block";
    this.materialListElem.style.width = "90%";
    this.materialListElem.style.marginLeft = "auto";
    this.materialListElem.style.marginRight = "auto";

    this.materialListElem.addEventListener("change", event =>
    {
      this.loadMaterial();
    });

    this.newMaterialButton = Controls.addButton(this.panel.bodyElem,
      "new_material", "button.new", () => this.newMaterial());

    this.renameMaterialButton = Controls.addButton(this.panel.bodyElem,
      "rename_material", "button.rename", () => this.renameMaterial());

    this.materialUsageButton = Controls.addButton(this.panel.bodyElem,
      "material_usage", "button.material_usage", () => this.materialUsage());

    this.colorElem = Controls.addColorField(this.panel.bodyElem,
      "material_color", "label.color", null, "option_block inline");
    this.colorElem.addEventListener("input", event =>
    {
      let color = this.colorElem.value;
      let materialId = this.materialListElem.value;
      let material = this.materials.get(materialId);
      material.color.set(color);
      application.repaint();
    }, false);

    this.specularElem = Controls.addColorField(this.panel.bodyElem,
      "material_specular", "label.specular", null, "option_block inline");
    this.specularElem.addEventListener("input", event =>
    {
      let color = this.specularElem.value;
      let material = this.getSelectedMaterial();
      material.specular.set(color);
      application.repaint();
    }, false);

    this.emissiveElem = Controls.addColorField(this.panel.bodyElem,
      "material_specular", "label.emissive", null, "option_block inline");
    this.emissiveElem.addEventListener("input", event =>
    {
      let color = this.emissiveElem.value;
      let material = this.getSelectedMaterial();
      material.emissive.set(color);
      application.repaint();
    }, false);

    this.opacityElem = document.createElement("div");
    this.opacityElem.className = "option_block";
    this.panel.bodyElem.appendChild(this.opacityElem);

    this.opacityLabel = document.createElement("label");
    this.opacityLabel.htmlFor = "material_opacity";
    I18N.set(this.opacityLabel, "innerHTML", "label.opacity", 50);
    this.application.i18n.update(this.opacityLabel);
    this.opacityElem.appendChild(this.opacityLabel);

    this.opacityRange = document.createElement("input");
    this.opacityRange.id = "material_opacity";
    this.opacityRange.type = "range";
    this.opacityRange.min = 0;
    this.opacityRange.max = 100;
    this.opacityRange.step = 1;
    this.opacityRange.style.display = "block";
    this.opacityRange.style.width = "80%";
    this.opacityRange.style.marginLeft = "auto";
    this.opacityRange.style.marginRight = "auto";

    this.opacityElem.appendChild(this.opacityRange);

    this.opacityRange.addEventListener("input", () =>
    {
      let opacity = this.opacityRange.value;
      I18N.set(this.opacityLabel, "innerHTML", "label.opacity", opacity);
      application.i18n.update(this.opacityLabel);
      let material = this.getSelectedMaterial();
      material.opacity = opacity / 100;
      material.transparent = material.opacity < 1;
      application.repaint();
    }, false);

    this.sideSelect = Controls.addSelectField(this.panel.bodyElem,
      "material_side", "label.material_side",
      [[String(THREE.FrontSide), "label.front_side"],
       [String(THREE.BackSide), "label.back_side"],
       [String(THREE.DoubleSide), "label.double_side"]],
      null, "option_block inline");
    this.sideSelect.addEventListener("change", event =>
    {
      let material = this.getSelectedMaterial();
      material.side = parseInt(this.sideSelect.value);
      application.repaint();
    });

    this.depthTestCheckBox = Controls.addCheckBoxField(this.panel.bodyElem,
      "depth_test", "label.depth_test", false, "option_block");
    this.depthTestCheckBox.addEventListener("change", event =>
    {
      let material = this.getSelectedMaterial();
      material.depthTest = this.depthTestCheckBox.checked;
      application.repaint();
    });

    this.depthWriteCheckBox = Controls.addCheckBoxField(this.panel.bodyElem,
      "depth_write", "label.depth_write", false, "option_block");
    this.depthWriteCheckBox.addEventListener("change", event =>
    {
      let material = this.getSelectedMaterial();
      material.depthWrite = this.depthWriteCheckBox.checked;
      application.repaint();
    });

    this.applyElem = document.createElement("div");
    this.applyElem.className = "option_block";
    this.panel.bodyElem.appendChild(this.applyElem);

    this.applyMessageElem = document.createElement("div");
    I18N.set(this.applyMessageElem, "innerHTML", "label.material_on_selection");
    this.applyElem.appendChild(this.applyMessageElem);

    this.previewMaterialButton = Controls.addButton(this.applyElem,
      "preview_material", "button.preview_material",
      () => this.applyMaterial(
      (object, material) => object.highlightFaceMaterial = material));

    this.applyMaterialButton = Controls.addButton(this.applyElem,
      "apply_material", "button.apply_material", () => this.applyMaterial(
      (object, material) => object.material = material));

    this.restoreMaterialsButton = Controls.addButton(this.applyElem,
      "restore_material", "button.restore_materials", () => this.applyMaterial(
      (object) => object.highlightFaceMaterial = null));
  }

  activate()
  {
    this.panel.visible = true;
    this.findMaterials();
  }

  deactivate()
  {
    this.panel.visible = false;
  }

  loadMaterial()
  {
    let materialId = this.materialListElem.value;
    let material = this.materials.get(materialId);

    let haveMaterial = material !== undefined;

    this.colorElem.disabled = !haveMaterial;
    this.specularElem.disabled = !haveMaterial;
    this.emissiveElem.disabled = !haveMaterial;
    this.sideSelect.disabled = !haveMaterial;
    this.depthTestCheckBox.disabled = !haveMaterial;
    this.depthWriteCheckBox.disabled = !haveMaterial;
    this.opacityRange.disabled = !haveMaterial;
    this.renameMaterialButton.disabled = !haveMaterial;
    this.materialUsageButton.disabled = !haveMaterial;
    this.previewMaterialButton.disabled = !haveMaterial;
    this.applyMaterialButton.disabled = !haveMaterial;

    if (haveMaterial)
    {
      this.colorElem.value = "#" + material.color.getHexString();
      this.specularElem.value = "#" + material.specular.getHexString();
      this.emissiveElem.value = "#" + material.emissive.getHexString();
      this.sideSelect.value = String(material.side);
      this.depthTestCheckBox.checked = material.depthTest;
      this.depthWriteCheckBox.checked = material.depthWrite;

      let opacity = Math.round(material.opacity * 100);
      I18N.set(this.opacityLabel, "innerHTML", "label.opacity", opacity);
      this.application.i18n.update(this.opacityLabel);
      this.opacityRange.value = opacity;
    }
  }

  findMaterials()
  {
    const application = this.application;

    if (this.sceneUuid !== application.scene.uuid)
    {
      // clear materials if scene is new
      for (let material of this.materials.values())
      {
        material.dispose();
      }
      this.materials.clear();
      this.sceneUuid = application.scene.uuid;
    }

    const materials = this.materials;

    application.baseObject.traverse(object =>
    {
      let material = object.material;
      if (material instanceof THREE.MeshLambertMaterial
          || material instanceof THREE.MeshPhongMaterial)
      {
        let materialId = String(material.id);
        materials.set(materialId, material);
      }

      material = object.highlightFaceMaterial;
      if (material instanceof THREE.MeshLambertMaterial
          || material instanceof THREE.MeshPhongMaterial)
      {
        let materialId = String(material.id);
        materials.set(materialId, material);
      }
    });

    let materialOptions = [];

    for (let material of materials.values())
    {
      let materialName = this.getMaterialLabel(material);
      materialOptions.push([String(material.id), materialName]);
    }

    materialOptions.sort((a, b) => {
      if (a[1] === b[1]) return 0;
      return a[1] < b[1] ? -1 : 1;
    });

    Controls.setSelectOptions(this.materialListElem, materialOptions);

    this.loadMaterial();
  }

  newMaterial()
  {
    const dialog = new InputDialog(this.application,
      "title.new_material", "label.material_name", "");
    dialog.onAccept = name =>
    {
      let material = this.createMaterial(name);
      let optionElem = document.createElement("option");
      let materialId = String(material.id);
      optionElem.value = materialId;
      optionElem.innerHTML = this.getMaterialLabel(material);
      this.materialListElem.appendChild(optionElem);
      this.materialListElem.value = materialId;
      this.materials.set(materialId, material);
      this.loadMaterial();
      dialog.hide();
    };
    dialog.show();
  }

  renameMaterial()
  {
    let material = this.getSelectedMaterial();
    if (material)
    {
      const dialog = new InputDialog(this.application,
        "title.rename_material", "label.material_name", material.name);
      dialog.onAccept = name =>
      {
        material.name = name;
        let index = this.materialListElem.selectedIndex;
        this.materialListElem.options[index].innerHTML =
          this.getMaterialLabel(material);
        dialog.hide();
      };
      dialog.show();
    }
  }

  materialUsage()
  {
    let usages = [];
    let material = this.getSelectedMaterial();
    if (material)
    {
      const baseObject = this.application.baseObject;
      baseObject.traverse(object =>
      {
        if (object.visible)
        {
          if (object.faceMaterial === material)
          {
            usages.push(object);
          }
        }
      });
    }
    this.application.selection.set(...usages);
  }

  applyMaterial(action)
  {
    const application = this.application;
    let material = this.getSelectedMaterial();
    if (material)
    {
      const roots = application.selection.roots;
      for (let root of roots)
      {
        root.traverse(object =>
        {
          if (object instanceof Solid)
          {
            action(object, material);
          }
        });
      }
    }
    application.repaint();
  }

  createMaterial(name)
  {
    let material = new THREE.MeshPhongMaterial();
    material.color.set("#C0C0C0");
    material.name = name;
    material.needsUpdate = true;
    material.side = THREE.DoubleSide;
    return material;
  }

  getSelectedMaterial()
  {
    let materialId = this.materialListElem.value;
    return this.materials.get(materialId);
  }

  getMaterialLabel(material)
  {
    let name = material.name || "Unnamed";
    return name + " (m" + material.id + ")";
  }
}

export { PaintTool };

