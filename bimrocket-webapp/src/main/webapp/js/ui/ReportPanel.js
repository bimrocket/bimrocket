/**
 * ReportPanel.js
 *
 * @author realor
 */

import { Panel } from "./Panel.js";
import { Controls } from "./Controls.js";
import { MessageDialog } from "./MessageDialog.js";
import { Toast } from "./Toast.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class ReportPanel extends Panel
{
  constructor(application)
  {
    super(application);
    this.id = "report_panel";
    this.title = "Report";
    this.position = "left";
    this.minimumHeight = 200;

    this.reportElem = document.createElement("div");
    this.bodyElem.appendChild(this.reportElem);
    this.reportElem.className = "report_panel";
  }

  execute(name, code)
  {
    this.title = name;
    const application = this.application;
    const reportElem = this.reportElem;
    reportElem.innerHTML = "";

    try
    {
      let fn = new Function(code + "; return rules;");
      let rules = fn();

      let output = [];

      for (let rule of rules)
      {
        let objects = application.findObjects(rule.selectExpression);
        let issues = application.findObjects(
          $ => rule.selectExpression($) && rule.checkExpression($));

        output.push({
          "rule" : rule,
          "summary": rule.summary ? rule.summary(issues) : "count: " + issues.length,
          "issues" : issues,
          "count" : objects.length
        });
      }

      let headerElem = document.createElement("div");
      headerElem.style.padding = "2px";

      reportElem.appendChild(headerElem);

      let tree = new Tree(reportElem);

      let infoCount = 0;
      let warnCount = 0;
      let errorCount = 0;
      for (let item of output)
      {
        let className = item.rule.severity !== "info" &&
                        item.issues.length === 0 ?
                        "ok" : item.rule.severity;

        let ruleNode = tree.addNode(item.rule.code,
          () => this.selectIssues(item.issues), className);

        for (let i = 0; i < item.issues.length; i++)
        {
          let issue = item.issues[i];
          let msg = (i + 1) + ": " + item.rule.message(issue);
          let classNames = ObjectUtils.getObjectClassNames(issue);
          let issueNode = ruleNode.addNode(msg,
            () => this.selectIssues([issue]), classNames);

          issueNode.linkElem.title = msg;

          if (item.rule.severity === "warn") warnCount++;
          else if (item.rule.severity === "error") errorCount++;
          else infoCount++;
        }
        let perc = Math.round(100 * item.issues.length / item.count);
        let text = item.rule.code;
        if (item.count > 0)
        {
          text += " (" + item.issues.length + " / " + item.count + ") " + perc + "%";
        }
        ruleNode.value = text;
      }
      I18N.set(headerElem, "textContent",
        "message.report_summary", errorCount, warnCount);
      application.i18n.update(headerElem);
    }
    catch (ex)
    {
      reportElem.innerHTML = "ERROR: " + ex;
    }
  }

  selectIssues(issues)
  {
    const application = this.application;
    application.selection.set(...issues);
    application.useTool("center_selection");
  };
}

export { ReportPanel };