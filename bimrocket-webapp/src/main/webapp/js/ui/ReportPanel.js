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

      let outputs = [];

      for (let rule of rules)
      {
        let objects = application.findObjects(rule.selectExpression);
        let issues = application.findObjects(
          $ => rule.selectExpression($) && rule.checkExpression($));

        outputs.push({
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
      for (let output of outputs)
      {
        let className = output.rule.severity !== "info" &&
                        output.issues.length === 0 ?
                        "ok" : output.rule.severity;

        let ruleNode = tree.addNode(output.rule.code,
          () => this.highlightIssues(output), className);

        for (let i = 0; i < output.issues.length; i++)
        {
          let issue = output.issues[i];
          let msg = (i + 1) + ": " + output.rule.message(issue);
          let classNames = ObjectUtils.getObjectClassNames(issue);
          let issueNode = ruleNode.addNode(msg,
            () => this.highlightIssues(output, i), classNames);

          issueNode.linkElem.title = msg;

          if (output.rule.severity === "warn") warnCount++;
          else if (output.rule.severity === "error") errorCount++;
          else infoCount++;
        }
        let perc = Math.round(100 * output.issues.length / output.count);
        let text = output.rule.code;
        if (output.count > 0)
        {
          text += " (" + output.issues.length + " / " +
                         output.count + ") " + perc + "%";
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

  highlightIssues(output, issueIndex = -1)
  {
    const issues = issueIndex === -1 ?
      output.issues : [output.issues[issueIndex]];

    const application = this.application;
    application.selection.set(...issues);

    const rule = output.rule;

    if (typeof rule.highlight === "function")
    {
      rule.highlight();
    }
    else
    {
      // default highlight
      application.useTool("center_selection");
    }
  };
}

export { ReportPanel };