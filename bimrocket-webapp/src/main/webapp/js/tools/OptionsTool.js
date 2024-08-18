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
    const setup = application.setup;

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
      setup.userLanguage = this.languageSelect.value;
    });

    // Units

    this.unitsSelect = Controls.addSelectField(uiOptionsPanel, "units",
    "label.units", Application.UNITS);
    this.unitsSelect.parentElement.className = "option_block inline";

    this.unitsSelect.addEventListener("change", () =>
      setup.units = this.unitsSelect.value);

    // Decimals

    this.decimalsElem = Controls.addNumberField(uiOptionsPanel, "decimals",
    "label.decimals");
    this.decimalsElem.parentElement.className = "option_block inline";
    this.decimalsElem.min = 0;
    this.decimalsElem.max = 15;
    this.decimalsElem.addEventListener("change", () =>
      setup.decimals = parseInt(this.decimalsElem.value));

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
        setup.backgroundColor = this.backColorInput1.value;
      }
      else
      {
        this.backColorInput2.style.display = "";
        setup.backgroundColor1 = this.backColorInput1.value;
        setup.backgroundColor2 = this.backColorInput2.value;
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
        setup.backgroundColor = this.backColorInput1.value;
      }
      else
      {
        setup.backgroundColor1 = this.backColorInput1.value;
      }
    }, false);

    this.backColorInput2.addEventListener("input", event =>
      setup.backgroundColor2 = this.backColorInput2.value, false);

    this.panelOpacityRange = Controls.addRangeField(uiOptionsPanel,
      "panelopacity_range", "label.panel_opacity", 0, 1, 0.01, setup.panelOpacity);

    this.panelOpacityRange.addEventListener("input", () =>
      setup.panelOpacity = parseFloat(this.panelOpacityRange.value), false);

    // Frame rate divisor

    this.frdRange = Controls.addRangeField(uiOptionsPanel,
      "frd_range", "label.fr_divisor", 1, 10, 1, setup.frameRateDivisor);
    this.frdRange.addEventListener("change",
      () => setup.frameRateDivisor = parseInt(this.frdRange.value), false);

    // Selection Paint mode

    this.selPaintModeSelect = Controls.addSelectField(uiOptionsPanel,
      "selpaint_mode", "label.sel_paint_mode",
      [[Application.EDGES_SELECTION, "option.edges"],
       [Application.FACES_SELECTION, "option.faces"]], null,
     "option_block inline");

    this.selPaintModeSelect.addEventListener("change", event =>
    {
      setup.selectionPaintMode = this.selPaintModeSelect.value;
      application.updateSelection();
    });

    // Enable/disable deep selection visualization

    this.deepSelCheckBox = Controls.addCheckBoxField(uiOptionsPanel,
      "deep_sel", "label.show_deep_sel", false, "option_block");
    this.deepSelCheckBox.addEventListener("change", event =>
      setup.showDeepSelection = this.deepSelCheckBox.checked);

    // Enable/disable local axes visualization

    this.localAxesCheckBox = Controls.addCheckBoxField(uiOptionsPanel,
      "local_axes", "label.show_local_axes", false, "option_block");
    this.localAxesCheckBox.addEventListener("change", event =>
      setup.showLocalAxes = this.localAxesCheckBox.checked);

    // Enable/disable shadows

    this.shadowsCheckBox = Controls.addCheckBoxField(uiOptionsPanel,
      "shadows", "label.cast_shadows", false, "option_block");
    this.shadowsCheckBox.addEventListener("change", event =>
      setup.shadowsEnabled = this.shadowsCheckBox.checked);

    // Enable/disable ambient occlusion

    this.aoCheckBox = Controls.addCheckBoxField(uiOptionsPanel,
      "aoEnabled", "label.ambient_occlusion", false, "option_block");
    this.aoCheckBox.addEventListener("change", event => {
      setup.ambientOcclusionEnabled = this.aoCheckBox.checked;
      this.aoIntensityRange.disabled = !this.aoCheckBox.checked;
    });

    this.aoIntensityRange = Controls.addRangeField(uiOptionsPanel,
      "aoIntensity", "label.ambient_occlusion_intensity",
      0, 1, 0.01, setup.ambientOcclusionIntensity);
    this.aoIntensityRange.addEventListener("input",
      () => setup.ambientOcclusionIntensity = parseFloat(this.aoIntensityRange.value));

    // Loader/Export

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
    const setup = application.setup;

    this.backColorInput1.value = setup.backgroundColor1;
    this.backColorInput2.value = setup.backgroundColor2;

    if (setup.backgroundColor1 === setup.backgroundColor2)
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
    this.unitsSelect.value = setup.units;
    this.decimalsElem.value = setup.decimals;
    this.panelOpacityRange.rangeValue = setup.panelOpacity;
    this.frdRange.rangeValue = setup.frameRateDivisor;
    this.selPaintModeSelect.value = setup.selectionPaintMode;
    this.deepSelCheckBox.checked = setup.showDeepSelection;
    this.localAxesCheckBox.checked = setup.showLocalAxes;
    this.shadowsCheckBox.checked = setup.shadowsEnabled;
    this.aoCheckBox.checked = setup.ambientOcclusionEnabled;
    this.aoIntensityRange.rangeValue = setup.ambientOcclusionIntensity;
    this.aoIntensityRange.disabled = !setup.ambientOcclusionEnabled;

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
