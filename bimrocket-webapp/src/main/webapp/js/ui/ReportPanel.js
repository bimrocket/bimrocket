/**
 * ReportPanel.js
 *
 * @author realor
 */

import { Panel } from "./Panel.js";
import { Controls } from "./Controls.js";
import { Report } from "../reports/Report.js";
import { ReportType } from "../reports/ReportType.js";
import { MessageDialog } from "./MessageDialog.js";
import { Toast } from "./Toast.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "three";

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

  execute(name, source, reportTypeName)
  {
    this.title = name;
    const application = this.application;
    const reportElem = this.reportElem;
    reportElem.innerHTML = "";
    if (!this.visible) this.visible = true;
    else this.minimized = false;

    try
    {
      const reportType = ReportType.getReportType(reportTypeName);
      if (!reportType) throw "Unsupported report type";
      const report = reportType.parse(source);

      let outputs = [];

      for (let rule of report.rules)
      {
        let objects = application.findObjects($ => rule.selectObject($));
        let issues = application.findObjects(
          $ => rule.selectObject($) && rule.checkObject($));

        outputs.push({
          "rule" : rule,
          "summary": rule.getSummary(issues),
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
        let minOccurs = output.rule.getMinOccurs();
        let maxOccurs = output.rule.getMaxOccurs();
        let cardinalityError = output.count < minOccurs ||
          (maxOccurs !== null && output.count > maxOccurs);

        let severity = output.rule.getSeverity();
        let ruleClassName;
        if (cardinalityError) ruleClassName = "error";
        else if (output.issues.length > 0) ruleClassName = severity;
        else ruleClassName = "ok";

        let ruleNode = tree.addNode(output.rule.getCode(),
          () => this.highlightIssues(output), ruleClassName);

        for (let i = 0; i < output.issues.length; i++)
        {
          let issue = output.issues[i];
          let msg = (i + 1) + ": " + output.rule.getMessage(issue);
          let classNames = ObjectUtils.getObjectClassNames(issue);
          let issueNode = ruleNode.addNode(msg,
            () => this.highlightIssues(output, i), classNames);

          issueNode.linkElem.title = msg;

          if (severity === "warn") warnCount++;
          else if (severity === "error") errorCount++;
          else infoCount++;
        }
        let perc = Math.round(100 * output.issues.length / output.count);
        let text = output.rule.getCode();
        if (output.count > 0)
        {
          text += " (" + output.issues.length + " / " +
                         output.count + ") " + perc + "%";
        }
        ruleNode.value = text;
        if (output.summary)
        {
          ruleNode.addNode(output.summary, null, ruleClassName);
        }
        if (cardinalityError)
        {
          if (severity === "warn") warnCount++;
          else if (severity === "error") errorCount++;
          else infoCount++;

          ruleNode.addNode(`Invalid cardinality, expected
            [${minOccurs}..${maxOccurs === null ? "*" : maxOccurs}],
            actual: ${output.count}`,
            null, ruleClassName);
        }
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

    if (!rule.highlightObjects())
    {
      // default highlight
      application.useTool("center_selection");
    }
  };
}

export { ReportPanel };