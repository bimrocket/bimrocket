/**
 * SetupPanel.js
 *
 * @author realor
 */

import { Panel } from "platform/ui/panel/Panel.js";
import { Application } from "platform/ui/Application.js";
import { Controls } from "platform/ui/Controls.js";
import { TabbedPane } from "platform/ui/tabbedpane/TabbedPane.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";
import { InputDialog } from "platform/ui/dialog/InputDialog.js";
import { Toast } from "platform/ui/toast/Toast.js";
import { IOManager } from "platform/io/IOManager.js";
import { CSSManager } from "platform/ui/CSSManager.js";
import { ModuleManager } from "platform/module/ModuleManager.js";
import { I18N } from "platform/i18n/I18N.js";

class SetupPanel extends Panel
{
  constructor(application)
  {
    super(application);
    this.id = "setup";
    this.title = "base|tool.setup.label";
    this.position = "left";
    this.iconName = "base|setup";
    this.defaultHeight = 400;
    this.defaultMobileHeight = 400;
    this.minimumHeight = 200;

    this.onClose = () => application.useTool(null);

    this.setClassName("modules");

    this.tabbedPane = new TabbedPane(this.bodyElem);
    this.tabbedPane.addClassName("h-full");

    this.createUITab();
    this.createRenderTab();
    this.createLoaderTab();
    this.createExporterTab();
    this.createModuleTab();
  }

  createUITab()
  {
    const application = this.application;
    const setup = application.setup;
    const i18n = application.i18n;

    const uiOptionsPanel =
      this.tabbedPane.addTab("ui_setup", "base|tool.setup.ui");

    // Language

    this.languageSelect = Controls.addSelectField(uiOptionsPanel,
      "language", "base|label.language");
    this.languageSelect.parentElement.className = "field-row";
    this.languageSelect.addEventListener("change", () =>
    {
      setup.userLanguage = this.languageSelect.value;
    });

    // Units

    this.unitsSelect = Controls.addSelectField(uiOptionsPanel, "units",
    "base|label.units", Application.UNITS);
    this.unitsSelect.parentElement.className = "field-row";

    this.unitsSelect.addEventListener("change", () =>
      setup.units = this.unitsSelect.value);

    // Decimals

    this.decimalsElem = Controls.addNumberField(uiOptionsPanel, "decimals",
    "base|label.decimals");
    this.decimalsElem.parentElement.className = "field-row";
    this.decimalsElem.min = 0;
    this.decimalsElem.max = 15;
    this.decimalsElem.addEventListener("change", () =>
      setup.decimals = parseInt(this.decimalsElem.value));

    // Background color

    this.backSelect = Controls.addSelectField(uiOptionsPanel,
      "backcolor_sel", "base|label.background_color",
      [["solid", "base|option.solid"], ["gradient", "base|option.gradient"]],
      null, "field-row");
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

    const colorsElem = document.createElement("div");
    colorsElem.className = "flex align-items-center";
    colorsElem.style.gap = "4px";
    colorsElem.appendChild(this.backSelect);
    backColorElem.appendChild(colorsElem);

    this.backColorInput1 = document.createElement("input");
    this.backColorInput1.id = "back_color1";
    this.backColorInput1.type = "color";
    colorsElem.appendChild(this.backColorInput1);

    this.backColorInput2 = document.createElement("input");
    this.backColorInput2.id = "back_color2";
    this.backColorInput2.type = "color";
    colorsElem.appendChild(this.backColorInput2);

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
      "panelopacity_range", "base|label.panel_opacity", 0, 1, 0.01, setup.panelOpacity);

    this.panelOpacityRange.addEventListener("input", () =>
      setup.panelOpacity = parseFloat(this.panelOpacityRange.value), false);

    // CSS Theme
    this.themeSelect = Controls.addSelectField(uiOptionsPanel,
      "theme", "base|label.theme");
    this.themeSelect.parentElement.className = "field-row";
    this.themeSelect.addEventListener("change", () =>
    {
      setup.theme = this.themeSelect.value;
    });

    // toolBar position
    this.toolBarPosSelect = Controls.addSelectField(uiOptionsPanel,
      "toolbar_pos", "base|label.toolbar_position",
      [["top", "base|option.toolbar_top"],
       ["bottom", "base|option.toolbar_bottom"]]);
    this.toolBarPosSelect.parentElement.className = "field-row";
    this.toolBarPosSelect.addEventListener("change", () =>
    {
      setup.toolBarPosition = this.toolBarPosSelect.value;
    });
  }

  createRenderTab()
  {
    const application = this.application;
    const setup = application.setup;
    const i18n = application.i18n;

    const renderPanel =
      this.tabbedPane.addTab("render", "base|tool.setup.render");

    // render mode

    this.renderModeSelect = Controls.addSelectField(renderPanel,
      "render_mode", "base|label.render_mode",
      [["normal", "base|option.render_mode.normal"],
       ["simplified", "base|option.render_mode.simplified"],
       ["batch", "base|option.render_mode.batch"]], null, "field-row");

    this.renderModeSelect.addEventListener("change", event =>
    {
      setup.renderMode = this.renderModeSelect.value;
      if (setup.renderMode !== "batch") application.destroyBatchedGroup();
    });

    // requested FPS

    this.fpsRange = Controls.addRangeField(renderPanel,
      "fps_range", "base|label.requested_fps", 0, 60, 1, setup.requestedFPS);
    this.fpsRange.addEventListener("change",
      () => setup.requestedFPS = parseInt(this.fpsRange.value), false);

    // Selection Paint mode

    this.selPaintModeSelect = Controls.addSelectField(renderPanel,
      "selpaint_mode", "base|label.sel_paint_mode",
      [[Application.EDGES_SELECTION, "base|option.edges"],
       [Application.FACES_SELECTION, "base|option.faces"]], null,
     "field-row");

    this.selPaintModeSelect.addEventListener("change", event =>
    {
      setup.selectionPaintMode = this.selPaintModeSelect.value;
      application.updateSelection();
    });

    // Enable/disable deep selection visualization

    this.deepSelCheckBox = Controls.addSwitchField(renderPanel,
      "deep_sel", "base|label.show_deep_sel", false, "field-row");
    this.deepSelCheckBox.addEventListener("change", event =>
      setup.showDeepSelection = this.deepSelCheckBox.checked);

    // Enable/disable local axes visualization

    this.localAxesCheckBox = Controls.addSwitchField(renderPanel,
      "local_axes", "base|label.show_local_axes", false, "field-row");
    this.localAxesCheckBox.addEventListener("change", event =>
      setup.showLocalAxes = this.localAxesCheckBox.checked);

    // Enable/disable shadows

    this.shadowsCheckBox = Controls.addSwitchField(renderPanel,
      "shadows", "base|label.cast_shadows", false, "field-row");
    this.shadowsCheckBox.addEventListener("change", event =>
      setup.shadowsEnabled = this.shadowsCheckBox.checked);

    // Enable/disable ambient occlusion

    this.aoCheckBox = Controls.addSwitchField(renderPanel,
      "aoEnabled", "base|label.ambient_occlusion", false, "field-row");
    this.aoCheckBox.addEventListener("change", event => {
      setup.ambientOcclusionEnabled = this.aoCheckBox.checked;
      this.aoIntensityRange.disabled = !this.aoCheckBox.checked;
    });

    this.aoIntensityRange = Controls.addRangeField(renderPanel,
      "aoIntensity", "base|label.ambient_occlusion_intensity",
      0, 1, 0.01, setup.ambientOcclusionIntensity);
    this.aoIntensityRange.addEventListener("input",
      () => setup.ambientOcclusionIntensity = parseFloat(this.aoIntensityRange.value));
  }

  createLoaderTab()
  {
    const application = this.application;
    const setup = application.setup;
    const i18n = application.i18n;

    const importPanel = this.tabbedPane.addTab("loaders_options",
      "base|tool.setup.import");
    const loaderOptionsPanel = document.createElement("div");
    importPanel.appendChild(loaderOptionsPanel);
    loaderOptionsPanel.className = "p_4 text-left flex flex-column border-box h-full";

    this.loaderSelect = Controls.addSelectField(loaderOptionsPanel,
      "loader_sel", "base|tool.setup.format", [], null, "field-flex mb-4");
    this.loaderSelect.addEventListener("change", () => this.loadOptions("loader"));

    this.loaderOptionsView = Controls.addCodeEditor(loaderOptionsPanel,
      "loader_editor", "base|tool.setup.options", "",
      { "language": "json", "height": "200px" });

    const loaderButtonsPanel = document.createElement("div");
    loaderButtonsPanel.className = "text-center";
    loaderOptionsPanel.appendChild(loaderButtonsPanel);
    Controls.addButton(loaderButtonsPanel, "loader_save", "button.save",
    () => this.saveOptions("loader", false));
    Controls.addButton(loaderButtonsPanel, "loader_restore", "button.restore",
    () => this.saveOptions("loader", true));
  }

  createExporterTab()
  {
    const application = this.application;
    const setup = application.setup;
    const i18n = application.i18n;

    const exportPanel = this.tabbedPane.addTab("exporters_options",
      "base|tool.setup.export");
    const exporterOptionsPanel = document.createElement("div");
    exportPanel.appendChild(exporterOptionsPanel);
    exporterOptionsPanel.className = "p_4 text-left flex flex-column border-box h-full";

    this.exporterSelect = Controls.addSelectField(exporterOptionsPanel,
      "loader_sel", "base|tool.setup.format", [], null, "field-flex mb-4");
    this.exporterSelect.addEventListener("change", () => this.loadOptions("exporter"));

    this.exporterOptionsView = Controls.addCodeEditor(exporterOptionsPanel,
      "exporter_editor", "base|tool.setup.options", "",
      { "language": "json", "height": "200px" });

    const exporterButtonsPanel = document.createElement("div");
    exporterButtonsPanel.className = "text-center";
    exporterOptionsPanel.appendChild(exporterButtonsPanel);
    Controls.addButton(exporterButtonsPanel, "exporter_save", "button.save",
    () => this.saveOptions("exporter", false));
    Controls.addButton(exporterButtonsPanel, "exporter_restore", "button.restore",
    () => this.saveOptions("exporter", true));

    let elems = this.bodyElem.getElementsByClassName("code_editor");
    for (let elem of elems)
    {
      elem.style.flexGrow = "1";
    }
  }

  createModuleTab()
  {
    const modulePanel = this.tabbedPane.addTab("modules",
      "base|tool.setup.modules");

    this.moduleListElem = document.createElement("ul");
    this.moduleListElem.className = "modules";
    modulePanel.appendChild(this.moduleListElem);

    const buttonsElem = document.createElement("div");
    buttonsElem.className = "flex button-bar";
    modulePanel.appendChild(buttonsElem);

    const addElem = document.createElement("div");
    addElem.className = "flex-grow-1 flex justify-left";
    buttonsElem.appendChild(addElem);

    this.addButton = Controls.addButton(addElem,
      "mod_add", "button.add", () => this.addModule());

    this.applyButton = Controls.addButton(buttonsElem,
      "mod_apply", "button.apply", () => this.applyModules());

    this.applyButton = Controls.addButton(buttonsElem,
      "mod_cancel", "button.cancel", () => this.cancelModules());
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
    Controls.setCodeEditorDocument(editorView, json, { "language": "json" });
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
        Toast.create("base|message.options_restored")
          .setI18N(this.application.i18n).show();
      }
      else
      {
        let json = editorView.state.doc.toString();
        options = JSON.parse(json);
        setOptions(formatName, options);
        Toast.create("base|message.options_saved")
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

  onShow()
  {
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
    supportedLanguages = supportedLanguages.map(lang =>
    {
      let intl = new Intl.DisplayNames([lang], { type: "language" });
      return [lang, intl.of(lang)];
    });
    Controls.setSelectOptions(this.languageSelect, supportedLanguages);
    this.languageSelect.value = setup.userLanguage;
    this.unitsSelect.value = setup.units;
    this.decimalsElem.value = setup.decimals;
    this.panelOpacityRange.rangeValue = setup.panelOpacity;
    this.renderModeSelect.value = setup.renderMode;
    this.fpsRange.rangeValue = setup.requestedFPS;
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

    let themes = CSSManager.listThemes();
    Controls.setSelectOptions(this.themeSelect, themes);
    this.themeSelect.value = setup.theme || "default";

    this.toolBarPosSelect.value = setup.toolBarPosition;

    this.loadOptions("loader");
    this.loadOptions("exporter");
    this.listModules();
  }

  async listModules()
  {
    const moduleListElem = this.moduleListElem;
    const modules = await ModuleManager.listModules();
    moduleListElem.innerHTML = "";
    for (let module of modules)
    {
      this.addModuleEntry(module);
    }
  }

  addModuleEntry(module, expanded = false)
  {
    let itemElem = document.createElement("li");
    this.updateModuleEntry(itemElem, module, expanded);

    this.moduleListElem.appendChild(itemElem);
    if (expanded)
    {
      this.addButton.scrollIntoView();
    }
    if (!module.isRead())
    {
      module.read().finally(() =>
      {
        this.updateModuleEntry(itemElem, module, expanded);
        this.addButton.scrollIntoView();
      });
    }
    return itemElem;
  }

  updateModuleEntry(itemElem, module, expanded = false)
  {
    const moduleElem = document.createElement("div");
    moduleElem.className =
      "flex flex-column mt-4 mb-4 pb-2 text-left box-shadow-1 border-1";

    const mainElem = document.createElement("div");
    mainElem.className = "flex p-2 align-items-center";
    moduleElem.appendChild(mainElem);

    const isExternal = module.isExternal();
    const error = module.error;

    Controls.addIcon(mainElem, isExternal ?
      "base|external-module" : "base|module");

    const nameElem = document.createElement("label");
    nameElem.className = "ml-1 flex-grow-1 font-bold";
    nameElem.textContent = module.name + "-" + module.version;
    mainElem.appendChild(nameElem);

    const activeModules = this.application.activeModules;
    const isActive = activeModules.has(module);

    const checkElem = Controls.addSwitch(mainElem, "mod_action",
      "base|label.activation", isActive);

    nameElem.setAttribute("for", checkElem.id);

    checkElem.dataset.path = module.path;
    checkElem.dataset.name = module.name;
    if (error) checkElem.disabled = true;

    checkElem.addEventListener("change", event => this.toggle(checkElem));

    let description;
    if (!module.isRead())
    {
      description = "base|message.module_reading";
    }
    else if (error)
    {
      description = "base|label.module_error_state";
    }
    else
    {
      description = module.getValueKey("description");
    }

    // accordion
    const accordionElem = Controls.addAccordion(moduleElem,
      description, this.createModuleInfo(module));
    if (expanded) accordionElem.toggle();

    const accordionButton = accordionElem.querySelector(".accordion-button");
    accordionButton.className = "accordion-button pl-2 pr-2";

    const accordionContent = accordionElem.querySelector(".accordion-content");

    const buttonBar = document.createElement("div");
    buttonBar.className = "pt-1 pl-2 pr-2 flex justify-right border-separator-top";
    accordionContent.appendChild(buttonBar);

    if (module.isExternal())
    {
      Controls.addIconButton(buttonBar, "reload", "button.reload", "reload",
        () =>
        {
          module.clear();
          this.updateModuleEntry(itemElem, module, true);
          module.read().finally(() =>
            this.updateModuleEntry(itemElem, module, true));
        }, "icon-button-24");

      Controls.addIconButton(buttonBar, "remove", "button.delete", "trash",
        () =>
        {
          moduleElem.classList.add("hidden");
          checkElem.dataset.delete = "true";
        }, "icon-button-24 ml-1");
    }

    if (module.isValueDefined("infoUrl"))
    {
      Controls.addIconButton(buttonBar, "web", "button.open", "base|world",
        () =>
        {
          window.open(this.application.i18n.get(module.id + "|" + "infoUrl"));
        }, "icon-button-24 ml-1");
    }

    itemElem.replaceChildren(moduleElem);

    this.application.i18n.updateTree(moduleElem);
  }

  createModuleInfo(module)
  {
    const listElem = document.createElement("ul");
    let properties;

    if (!module.isRead() || module.error)
    {
      properties = ["path", "error"];
    }
    else
    {
      properties = ["path", "developer", "author", "releaseDate", "license"];
    }

    for (let property of properties)
    {
      if (module[property] || module.isValueDefined(property))
      {
        let itemElem = document.createElement("li");
        itemElem.className = "field-row m-0 p-2 border-separator-top bg-hover";

        let labelElem = document.createElement("div");
        labelElem.className = "label";
        I18N.set(labelElem, "textContent", "base|label.module_" + property);
        itemElem.appendChild(labelElem);

        let valueElem = document.createElement("div");
        valueElem.className = "value";
        if (module[property])
        {
          valueElem.textContent = module[property];
        }
        else
        {
          I18N.set(valueElem, "textContent", module.getValueKey(property));
        }
        itemElem.appendChild(valueElem);

        listElem.appendChild(itemElem);
      }
    }
    return listElem;
  }

  addModule()
  {
    const dialog = new InputDialog(this.application,
      "base|title.add_module", "base|label.module_url", "").setSize(380, 160);

    dialog.onAccept = async url =>
    {
      if (url.startsWith("http://") || url.startsWith("https://"))
      {
        let module = ModuleManager.getModule(url);
        if (!module)
        {
          module = ModuleManager.addModule(url);
          this.addModuleEntry(module, true);
        }
        dialog.hide();
      }
    };
    dialog.show();
  }

  toggle(checkElem)
  {
    const elements = this.moduleListElem.querySelectorAll("[data-name]");
    for (let element of elements)
    {
      if (element !== checkElem)
      {
        if (checkElem.dataset.name === element.dataset.name)
        {
          element.checked = false;
        }
      }
    }
    console.info(checkElem);
  }

  applyModules()
  {
    const elements = document.querySelectorAll("[data-path]");
    const modulePaths = [];
    for (let element of elements)
    {
      if (element.dataset.delete === "true")
      {
        ModuleManager.removeModule(element.dataset.path);
      }
      else if (element.checked)
      {
        modulePaths.push(element.dataset.path);
      }
    }
    this.application.setup.setItem("modules", modulePaths.join(","));
    window.location.href = window.location.origin + window.location.pathname;
  }

  cancelModules()
  {
    this.listModules();
  }
}

export { SetupPanel };

