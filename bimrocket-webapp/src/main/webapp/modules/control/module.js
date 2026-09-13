/**
 * control module
 *
 * @author realor
 */

import { StartControllersTool } from "./tools/StartControllersTool.js";
import { StopControllersTool } from "./tools/StopControllersTool.js";

import { AutoPilotController } from "./controllers/AutoPilotController.js";
import { Brain4itPostController } from "./controllers/Brain4itPostController.js";
import { Brain4itWatchController } from "./controllers/Brain4itWatchController.js";
import { ColorController } from "./controllers/ColorController.js";
import { DisplayController } from "./controllers/DisplayController.js";
import { KnobController } from "./controllers/KnobController.js";
import { LightController } from "./controllers/LightController.js";
import { ProximityController } from "./controllers/ProximityController.js";
import { PushButtonController } from "./controllers/PushButtonController.js";
import { RestPollController } from "./controllers/RestPollController.js";
import { RotationController } from "./controllers/RotationController.js";
import { SelectListController } from "./controllers/SelectListController.js";
import { ToggleButtonController } from "./controllers/ToggleButtonController.js";
import { TranslationController } from "./controllers/TranslationController.js";

import { BundleManager } from "platform/i18n/BundleManager.js";
import { IconManager } from "platform/ui/IconManager.js";
import { CSSManager } from "platform/ui/CSSManager.js";

import * as THREE from "three";

export function activate(application)
{
  BundleManager.setBundle("control", "./i18n/control", import.meta);
  //IconManager.setSprite("control", "./assets/icons.svg", import.meta);
  CSSManager.setCSS("controllers", "./assets/css/controllers.css", import.meta);

  // create tools
  const startControllersTool = new StartControllersTool(application);
  const stopControllersTool = new StopControllersTool(application);

  // create menus
  const menuBar = application.menuBar;

  const panelsMenu = menuBar.getMenu("base|menu.panels");

  const controlMenu = menuBar.addMenu("control|menu.control", panelsMenu?.getIndex());
  controlMenu.addMenuItem(startControllersTool);
  controlMenu.addMenuItem(stopControllersTool);
}
