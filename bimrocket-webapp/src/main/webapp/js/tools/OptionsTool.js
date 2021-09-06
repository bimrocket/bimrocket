/*
 * OptionsTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";
import { Application } from "../ui/Application.js";
import { Controls } from "../ui/Controls.js";
import { I18N } from "../i18n/I18N.js";

class OptionsTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "options";
    this.label = "tool.options.label";
    this.help = "tool.options.help";
    this.className = "options";
    this.setOptions(options);
    this.createPanel();
  }

  createPanel()
  {
    const application = this.application;

    this.panel = application.createPanel(this.label, "left", "panel_options");

    // Language
    const i18n = this.application.i18n;
    this.languageSelect = Controls.addSelectField(this.panel.bodyElem,
      "language", "label.language");
    this.languageSelect.parentElement.className = "option_block inline";
    this.languageSelect.addEventListener("change", () =>
    {
      let userLanguage = this.languageSelect.value;
      i18n.userLanguages = userLanguage;
      i18n.updateTree(this.application.element);
      window.localStorage.setItem("bimrocket.language", userLanguage);
    });

    // Units
    this.unitsSelect = Controls.addSelectField(this.panel.bodyElem, "units",
    "label.units", Application.UNITS);
    this.unitsSelect.parentElement.className = "option_block inline";

    this.unitsSelect.addEventListener("change", () =>
      application.units = this.unitsSelect.value);

    // Decimals
    this.decimalsElem = Controls.addNumberField(this.panel.bodyElem, "decimals",
    "label.decimals");
    this.decimalsElem.parentElement.className = "option_block inline";
    this.decimalsElem.min = 0;
    this.decimalsElem.max = 15;
    this.decimalsElem.addEventListener("change", () =>
      application.decimals = parseInt(this.decimalsElem.value));

    // Frame rate divisor

    const frdElem = document.createElement("div");
    frdElem.className = "option_block";
    this.panel.bodyElem.appendChild(frdElem);

    const frdValueDiv = document.createElement("div");
    frdElem.appendChild(frdValueDiv);

    const frdLabel = document.createElement("label");
    I18N.set(frdLabel, "innerHTML", "label.fr_divisor");
    frdLabel.htmlFor = "frd_range";
    frdValueDiv.appendChild(frdLabel);

    this.frdValue = document.createElement("span");
    this.frdValue.innerHTML = "";
    this.frdValue.id = "frd_value";
    this.frdValue.innerHTML = application.frameRateDivisor;
    this.frdValue.style.marginLeft = "4px";
    frdValueDiv.appendChild(this.frdValue);

    this.frdRange = document.createElement("input");
    this.frdRange.id = "frd_range";
    this.frdRange.type = "range";
    this.frdRange.min = 1;
    this.frdRange.max = 10;
    this.frdRange.step = 1;
    this.frdRange.style.display = "inline-block";
    this.frdRange.style.width = "80%";
    this.frdRange.style.marginLeft = "auto";
    this.frdRange.style.marginRight = "auto";

    frdElem.appendChild(this.frdRange);

    this.frdRange.addEventListener("input",
      () => this.frdValue.innerHTML = this.frdRange.value, false);

    this.frdRange.addEventListener("change",
      () => application.frameRateDivisor = parseInt(this.frdRange.value),
      false);

    // Selection Paint mode

    this.selPaintModeSelect = Controls.addSelectField(this.panel.bodyElem,
      "selpaint_mode", "label.sel_paint_mode",
      [[Application.EDGES_SELECTION, "option.edges"],
       [Application.FACES_SELECTION, "option.faces"]], null,
     "option_block inline");

    this.selPaintModeSelect.addEventListener("change", event =>
    {
      application.selectionPaintMode = this.selPaintModeSelect.value;
      application.updateSelection();
    });

    // Enable/disable deep selection visualization

    this.deepSelCheckBox = Controls.addCheckBoxField(this.panel.bodyElem,
      "deep_sel", "label.show_deep_sel", false, "option_block");
    this.deepSelCheckBox.addEventListener("change", event =>
      application.showDeepSelection = this.deepSelCheckBox.checked);

    // Enable/disable local axes visualization

    this.localAxesCheckBox = Controls.addCheckBoxField(this.panel.bodyElem,
      "local_axes", "label.show_local_axes", false, "option_block");
    this.localAxesCheckBox.addEventListener("change", event =>
      application.showLocalAxes = this.localAxesCheckBox.checked);

    // Background color

    this.backSelect = Controls.addSelectField(this.panel.bodyElem,
      "backcolor_sel", "label.background_color",
      [["solid", "option.solid"], ["gradient", "option.gradient"]],
      null, "option_block stack");
    const backColorElem = this.backSelect.parentElement;

    this.backSelect.addEventListener("change", event =>
    {
      if (this.backSelect.value === "solid")
      {
        this.backColorInput2.style.display = "none";
        application.backgroundColor = this.backColorInput1.value;
      }
      else
      {
        this.backColorInput2.style.display = "";
        application.backgroundColor1 = this.backColorInput1.value;
        application.backgroundColor2 = this.backColorInput2.value;
      }
    }, false);

    this.backColorInput1 = document.createElement("input");
    this.backColorInput1.id = "back_color1";
    this.backColorInput1.type = "color";
    this.backColorInput1.className = "back_color";
    backColorElem.appendChild(this.backColorInput1);

    this.backColorInput2 = document.createElement("input");
    this.backColorInput2.id = "back_color2";
    this.backColorInput2.type = "color";
    this.backColorInput2.className = "back_color";
    backColorElem.appendChild(this.backColorInput2);

    this.backColorInput1.addEventListener("input", event =>
    {
      if (this.backSelect.value === "solid")
      {
        application.backgroundColor = this.backColorInput1.value;
      }
      else
      {
        application.backgroundColor1 = this.backColorInput1.value;
      }
    }, false);

    this.backColorInput2.addEventListener("input", event =>
      application.backgroundColor2 = this.backColorInput2.value, false);

    this.panelOpacityRange = Controls.addInputField(this.panel.bodyElem,
      "range", "panelopac_range", "label.panel_opacity",
      null, "option_block stack");
    this.panelOpacityRange.min = 1;
    this.panelOpacityRange.max = 100;
    this.panelOpacityRange.step = 1;
    this.panelOpacityRange.style.display = "inline-block";
    this.panelOpacityRange.style.width = "80%";
    this.panelOpacityRange.style.marginLeft = "auto";
    this.panelOpacityRange.style.marginRight = "auto";

    this.panelOpacityRange.addEventListener("input", () =>
      application.panelOpacity = 0.01 * parseInt(this.panelOpacityRange.value),
      false);
  }

  activate()
  {
    this.panel.visible = true;

    const application = this.application;

    this.backColorInput1.value = application.backgroundColor1;
    this.backColorInput2.value = application.backgroundColor2;

    if (application.backgroundColor1 === application.backgroundColor2)
    {
      this.backSelect.value = "solid";
      this.backColorInput2.style.display = "none";
    }
    else
    {
      this.backSelect.value = "gradient";
      this.backColorInput2.style.display = "";
    }

    const i18n = application.i18n;
    let supportedLanguages = Array.from(i18n.supportedLanguages);
    let userLanguage = i18n.requestedLanguages[0];
    let intl = new Intl.DisplayNames([userLanguage], { type: "language" });
    supportedLanguages = supportedLanguages.map(lang => [lang, intl.of(lang)]);
    Controls.setSelectOptions(this.languageSelect, supportedLanguages);
    this.languageSelect.value = userLanguage;
    this.unitsSelect.value = application.units;
    this.decimalsElem.value = application.decimals;
    this.frdValue.innerHTML = application.frameRateDivisor;
    this.frdRange.value = application.frameRateDivisor;
    this.selPaintModeSelect.value = application.selectionPaintMode;
    this.deepSelCheckBox.checked = application.showDeepSelection;
    this.localAxesCheckBox.checked = application.showLocalAxes;
    this.panelOpacityRange.value = 100 * application.panelOpacity;
  }

  deactivate()
  {
    this.panel.visible = false;
  }
}

export { OptionsTool };
