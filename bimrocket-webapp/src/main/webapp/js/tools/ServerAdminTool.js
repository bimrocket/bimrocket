/*
 * ServerAdminTool.js
 */

import { Tool } from "./Tool.js";
import { ServerAdminDialog } from "../ui/ServerAdminDialog.js";

class ServerAdminTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "server_admin";
    this.label = "bim|tool.server_admin.label";
    this.className = "admin";
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.dialog = new ServerAdminDialog(this.application,
      { title : "bim|title.admin_service" });
  }

  execute()
  {
    this.dialog.show();
  }

}

export { ServerAdminTool };