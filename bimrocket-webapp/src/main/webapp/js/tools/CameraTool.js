/*
 * CameraTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import * as THREE from "three";

class CameraTool extends Tool
{
  constructor(application)
  {
    super(application);
  }

  static init(application, cameraOptions)
  {
    if (application._cameraSetup) return;

    const cameraSetup = Object.assign({
      defaultCameraToolName : "orbit",
      activateOnStartUp : true,
      activateOnAltKey : true,
      activateOnClear : true
    }, cameraOptions);

    cameraSetup.previousTool = null;

    application._cameraSetup = cameraSetup;

    application.addEventListener("tool", event =>
    {
      if (event.type === "activated")
      {
        if (!(event.tool instanceof CameraTool))
        {
          cameraSetup.previousTool = event.tool;
        }
      }
      else if (event.type === "clear")
      {
        cameraSetup.previousTool = null;

        const tool = this.getDefaultCameraTool(application);
        if (tool && cameraSetup.activateOnClear)
        {
          application.useTool(tool);
        }
      }
    });

    window.addEventListener("keydown", (event) =>
    {
      const tag = event.target.tagName.toLowerCase();

      if (tag === "input" || tag === "select") return;

      if (event.key === "Escape")
      {
        if (application.tool instanceof CameraTool)
        {
          this.restoreTool(application);
        }
      }
      else if (event.key === "Alt" && cameraSetup.activateOnAltKey)
      {
        event.preventDefault();
        const tool = this.getDefaultCameraTool(application);
        if (tool)
        {
          application.useTool(tool);
        }
      }
    });

    window.addEventListener("keyup", (event) =>
    {
      const tag = event.target.tagName.toLowerCase();

      if (tag === "input" || tag === "select") return;

      if (event.key === "Alt" && cameraSetup.activateOnAltKey)
      {
        if (application.tool instanceof CameraTool)
        {
          this.restoreTool(application);
        }
      }
    });

    if (cameraSetup.activateOnStartUp)
    {
      const tool = this.getDefaultCameraTool(application);
      if (tool)
      {
        application.useTool(tool);
      }
    }
  }

  static restoreTool(application)
  {
    const cameraSetup = application._cameraSetup;

    if (cameraSetup?.previousTool)
    {
      application.useTool(cameraSetup.previousTool);
    }
    else
    {
      application.useTool(null);
    }
  }

  static getDefaultCameraTool(application)
  {
    const toolName = application._cameraSetup?.defaultCameraToolName;

    return application.tools[toolName] || null;
  }
}

export { CameraTool };