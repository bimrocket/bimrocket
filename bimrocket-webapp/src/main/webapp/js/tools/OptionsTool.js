/*
 * OptionsTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Application } from "../ui/Application.js";
import { Controls } from "../ui/Controls.js";
import { TabbedPane } from "../ui/TabbedPane.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { Toast } from "../ui/Toast.js";
import { IOManager } from "../io/IOManager.js";
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
    this.panel.bodyElem.classList.add("p_4");

    this.tabbedPane = new TabbedPane(this.panel.bodyElem);
    this.tabbedPane.paneElem.style.height = "100%";

    const uiOptionsPanel =
      this.tabbedPane.addTab("ui_options", "tool.options.ui");

    const importPanel = this.tabbedPane.addTab("loaders_options",
      "tool.options.import");
    const loaderOptionsPanel = document.createElement("div");
    importPanel.appendChild(loaderOptionsPanel);
    loaderOptionsPanel.className = "p_4 text_left flex flex_column border_box h_full";

    const exportPanel = this.tabbedPane.addTab("exporters_options",
      "tool.options.export");
    const exporterOptionsPanel = document.createElement("div");
    exportPanel.appendChild(exporterOptionsPanel);
    exporterOptionsPanel.className = "p_4 text_left flex flex_column border_box h_full";

    // Language
    const i18n = this.application.i18n;
    this.languageSelect = Controls.addSelectField(uiOptionsPanel,
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
    this.unitsSelect = Controls.addSelectField(uiOptionsPanel, "units",
    "label.units", Application.UNITS);
    this.unitsSelect.parentElement.className = "option_block inline";

    this.unitsSelect.addEventListener("change", () =>
      application.units = this.unitsSelect.value);

    // Decimals
    this.decimalsElem = Controls.addNumberField(uiOptionsPanel, "decimals",
    "label.decimals");
    this.decimalsElem.parentElement.className = "option_block inline";
    this.decimalsElem.min = 0;
    this.decimalsElem.max = 15;
    this.decimalsElem.addEventListener("change", () =>
      application.decimals = parseInt(this.decimalsElem.value));

    // Frame rate divisor

    const frdElem = document.createElement("div");
    frdElem.className = "option_block";
    uiOptionsPanel.appendChild(frdElem);

    const frdValueDiv = document.createElement("div");
    frdElem.appendChild(frdValueDiv);

    const frdLabel = document.createElement("label");
    I18N.set(frdLabel, "textContent", "label.fr_divisor");
    frdLabel.htmlFor = "frd_range";
    frdValueDiv.appendChild(frdLabel);

    this.frdValue = document.createElement("span");
    this.frdValue.innerHTML = "";
    this.frdValue.id = "frd_value";
    this.frdValue.textContent = application.frameRateDivisor;
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
      () => this.frdValue.textContent = this.frdRange.value, false);

    this.frdRange.addEventListener("change",
      () => application.frameRateDivisor = parseInt(this.frdRange.value),
      false);

    // Selection Paint mode

    this.selPaintModeSelect = Controls.addSelectField(uiOptionsPanel,
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

    this.deepSelCheckBox = Controls.addCheckBoxField(uiOptionsPanel,
      "deep_sel", "label.show_deep_sel", false, "option_block");
    this.deepSelCheckBox.addEventListener("change", event =>
      application.showDeepSelection = this.deepSelCheckBox.checked);

    // Enable/disable local axes visualization

    this.localAxesCheckBox = Controls.addCheckBoxField(uiOptionsPanel,
      "local_axes", "label.show_local_axes", false, "option_block");
    this.localAxesCheckBox.addEventListener("change", event =>
      application.showLocalAxes = this.localAxesCheckBox.checked);

    // Enable/disable shadows

    this.shadowsCheckBox = Controls.addCheckBoxField(uiOptionsPanel,
      "shadows", "label.cast_shadows", false, "option_block");
    this.shadowsCheckBox.addEventListener("change", event =>
      application.shadowsEnabled = this.shadowsCheckBox.checked);

    // Background color

    this.backSelect = Controls.addSelectField(uiOptionsPanel,
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

    this.panelOpacityRange = Controls.addInputField(uiOptionsPanel,
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

    this.loaderSelect = Controls.addSelectField(loaderOptionsPanel,
      "loader_sel", "tool.options.format", [], null, "field_flex mb_4");
    this.loaderSelect.addEventListener("change", () => this.loadOptions("loader"));

    this.loaderOptionsView = Controls.addCodeEditor(loaderOptionsPanel,
      "loader_editor", "tool.options.options", "",
      { "language" : "json", "height" : "200px" });

    const loaderButtonsPanel = document.createElement("div");
    loaderButtonsPanel.className = "text_center";
    loaderOptionsPanel.appendChild(loaderButtonsPanel);
    Controls.addButton(loaderButtonsPanel, "loader_save", "button.save",
    () => this.saveOptions("loader", false));
    Controls.addButton(loaderButtonsPanel, "loader_restore", "button.restore",
    () => this.saveOptions("loader", true));

    this.exporterSelect = Controls.addSelectField(exporterOptionsPanel,
      "loader_sel", "tool.options.format", [], null, "field_flex mb_4");
    this.exporterSelect.addEventListener("change", () => this.loadOptions("exporter"));

    this.exporterOptionsView = Controls.addCodeEditor(exporterOptionsPanel,
      "exporter_editor", "tool.options.options", "",
      { "language" : "json", "height" : "200px" });

    const exporterButtonsPanel = document.createElement("div");
    exporterButtonsPanel.className = "text_center";
    exporterOptionsPanel.appendChild(exporterButtonsPanel);
    Controls.addButton(exporterButtonsPanel, "exporter_save", "button.save",
    () => this.saveOptions("exporter", false));
    Controls.addButton(exporterButtonsPanel, "exporter_restore", "button.restore",
    () => this.saveOptions("exporter", true));

    let elems = this.panel.bodyElem.getElementsByClassName("code_editor");
    for (let elem of elems)
    {
      elem.style.flexGrow = "1";
    }
  }

  loadOptions(type = "loader")
  {
    let formatName, options, editorView;
    if (type === "loader")
    {
      formatName = this.loaderSelect.value;
      options = IOManager.getLoaderOptions(formatName);
      editorView = this.loaderOptionsView;
    }
    else
    {
      formatName = this.exporterSelect.value;
      options = IOManager.getExporterOptions(formatName);
      editorView = this.exporterOptionsView;
    }
    const json = JSON.stringify(options, null, 2);
    Controls.setCodeEditorDocument(editorView, json, { "language" : "json" });
  }

  saveOptions(type = "loader", restore = false)
  {
    let formatName, options, editorView, setOptions;
    if (type === "loader")
    {
      formatName = this.loaderSelect.value;
      options = IOManager.getLoaderOptions(formatName, restore);
      editorView = this.loaderOptionsView;
      setOptions = IOManager.setLoaderOptions;
    }
    else
    {
      formatName = this.exporterSelect.value;
      options = IOManager.getExporterOptions(formatName, restore);
      editorView = this.exporterOptionsView;
      setOptions = IOManager.setExporterOptions;
    }

    try
    {
      if (restore)
      {
        editorView.dispatch({
          changes: {
            from: 0,
            to: editorView.state.doc.length,
            insert: JSON.stringify(options, null, 2)
          }
        });
        setOptions(formatName, options);
        Toast.create("message.options_restored")
          .setI18N(this.application.i18n).show();
      }
      else
      {
        let json = editorView.state.doc.toString();
        options = JSON.parse(json);
        setOptions(formatName, options);
        Toast.create("message.options_saved")
          .setI18N(this.application.i18n).show();
      }
    }
    catch (ex)
    {
      MessageDialog.create("ERROR", ex)
        .setClassName("error")
        .setI18N(this.application.i18n).show();
    }
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
    this.frdValue.textContent = application.frameRateDivisor;
    this.frdRange.value = application.frameRateDivisor;
    this.selPaintModeSelect.value = application.selectionPaintMode;
    this.deepSelCheckBox.checked = application.showDeepSelection;
    this.localAxesCheckBox.checked = application.showLocalAxes;
    this.shadowsCheckBox.checked = application.shadowsEnabled;
    this.panelOpacityRange.value = 100 * application.panelOpacity;

    let loaders = [];
    let exporters = [];
    for (let formatName in IOManager.formats)
    {
      let formatInfo = IOManager.formats[formatName];
      if (formatInfo.loader)
      {
        loaders.push([formatName, formatInfo.description]);
      }
      if (formatInfo.exporter)
      {
        exporters.push([formatName, formatInfo.description]);
      }
    }
    Controls.setSelectOptions(this.loaderSelect, loaders);
    Controls.setSelectOptions(this.exporterSelect, exporters);

    this.loadOptions("loader");
    this.loadOptions("exporter");
  }

  deactivate()
  {
    this.panel.visible = false;
  }
}

export { OptionsTool };
