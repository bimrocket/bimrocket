/**
 * ReportPanel.js
 *
 * @author realor
 */

import { Panel } from "platform/ui/panel/Panel.js";
import { Controls } from "platform/ui/Controls.js";
import { Report } from "platform/reports/Report.js";
import { ReportType } from "platform/reports/ReportType.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";
import { FileService, Result } from "platform/io/FileService.js";
import { Toast } from "platform/ui/toast/Toast.js";
import { I18N } from "platform/i18n/I18N.js";
import * as THREE from "three";

class ReportPanel extends Panel
{
  constructor(application)
  {
    super(application);
    this.id = "report_panel";
    this.title = "Report";
    this.position = "left";
    this.iconName = "analysis|report";
    this.defaultHeight = 240;
    this.defaultMobileHeight = 200;
    this.minimumHeight = 160;
    this.priority = 1;

    this.reportElem = document.createElement("div");
    this.bodyElem.appendChild(this.reportElem);
    this.reportElem.className = "report-panel";
    this.summary = {};
  }

  /**
   * @typedef {ReportDefinition} a report definition.
   * The properties of a ReportDefinition determine how to obtain the report.
   *
   * @property {Report} [report] - the report to run
   * @property {string} [source] - the report's source code.
   *   It requires the type property
   * @property {string} [type] - the report type (brs|ids|...)
   *   It requires the source property
   * @property {FileService} [service] - the file service from which to
   *   read the report's source code. It requires the path property
   * @property {string} [path] - the service path to the report's source code.
   *   It requires the service property
   * @property {string} [url] - the url to get the report's source code
   * @property {string] [title] - the title to display for this report.
   *   If title is '*', it will be obtained from report.title
   */

  /**
   * Runs the specified reports asynchronously.
   *
   * @param {ReportDefinition|ReportDefinition[]} definitions - a
   *   ReportDefinition or an array of ReportDefinition
   * @param {(ReportPanel) => void} onCompleted - The function to call once
   *   all reports have been executed.
   */
  runReports(definitions, onCompleted)
  {
    const queue = Array.isArray(definitions) ? [...definitions] : [definitions];

    this.clear();

    if (queue.length > 1)
    {
      // multiple reports, add the total summary element
      const totalSummaryElem = document.createElement("div");
      this.totalSummaryElem = totalSummaryElem;
      totalSummaryElem.className = "report-summary total";
      this.reportElem.appendChild(totalSummaryElem);

      I18N.set(totalSummaryElem, "textContent",
        "message.report_summary", 0, 0);
      this.application.i18n.update(totalSummaryElem);
    }
    else
    {
      this.totalSummaryElem = null;
    }

    const run = definition =>
    {
      let { report, source, type, path, title, name } = definition;

      try
      {
        if (!report)
        {
          const reportType = ReportType.getReportType(type);
          if (!reportType) throw "Unsupported report type";

          report = reportType.parse(source);
          if (!report.title) report.title = name || path;
        }
        this.runReport(report, title);
      }
      catch (ex)
      {
        this.addError(path || title, ex);
      }
      processNextReport();
    };

    const processNextReport = () =>
    {
      let definition = queue.shift();
      if (definition)
      {
        let { report, source, type, service, path, url } = definition;

        if (report instanceof Report ||
            (typeof source === "string" && typeof type === "string" ))
        {
          run(definition);
        }
        else if (service instanceof FileService && typeof path === "string")
        {
          service.read(path, result =>
          {
            if (result.status === Result.OK)
            {
              const name = result.metadata.name;
              let index = name.lastIndexOf(".");
              definition.type = index === -1 ?
                ReportType.getDefaultReportTypeName() :
                name.substring(index + 1).toLowerCase();
              definition.source = result.data;
              definition.name = name;
              run(definition);
            }
            else
            {
              this.addError(path, result.error);
              processNextReport();
            }
          });
        }
        else if (typeof url === "string")
        {
          let index = url.lastIndexOf("/");
          const name = index === -1 ? url : url.substring(index + 1);
          index = name.lastIndexOf(".");
          definition.type = index === -1 ?
            ReportType.getDefaultReportTypeName() :
            name.substring(index + 1).toLowerCase();
          definition.name = name;

          fetch(url)
            .then(response => response.text())
            .then(source =>
            {
              definition.source = source;
              run(definition);
            })
            .catch(error =>
            {
              this.addError(url, error);
              processNextReport();
            });
        }
        else
        {
          // ignore report definition, process next
          processNextReport();
        }
      }
      else
      {
        onCompleted?.(this);
      }
    };
    processNextReport();
  }

  /**
   * Clears the report panel and the summary object.
   */
  clear()
  {
    const reportElem = this.reportElem;
    reportElem.innerHTML = "";
    this.summary = {};
  }

  /**
   * Runs the given report and appends the issues to the panel.
   *
   * @param {Report} report - the report to run
   * @param {string} title - the title to display before de error summary. If
   *   title is '*', it will be obtained from report.title
   */
  runReport(report, title = "")
  {
    const application = this.application;
    const summary = this.summary;
    const reportElem = this.reportElem;
    const totalSummaryElem = this.totalSummaryElem;
    if (!this.visible) this.visible = true;
    else this.minimized = false;

    try
    {
      let outputs = [];

      for (let rule of report.rules)
      {
        let objects = application.findObjects($ => rule.selectObject($));
        let issues = application.findObjects(
          $ => rule.selectObject($) && rule.checkObject($));

        outputs.push({
          "rule": rule,
          "summary": rule.getSummary(issues),
          "issues": issues,
          "count": objects.length
        });
      }

      if (title)
      {
        if (title === "*") title = report.title;
        this.addTitle(title);
      }

      let summaryElem = document.createElement("div");
      summaryElem.className = "report-summary";
      reportElem.appendChild(summaryElem);

      let tree = new Tree(reportElem);
      tree.addEventListener("contextmenu",
        event => event.originalEvent.preventDefault());

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

          issueNode.nodeElem.title = msg;

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

      summary[report.title] = { infoCount, warnCount, errorCount };

      I18N.set(summaryElem, "textContent", "message.report_summary",
        errorCount, warnCount);
      application.i18n.update(summaryElem);

      if (totalSummaryElem)
      {
        summary.total ||= { infoCount : 0, warnCount : 0, errorCount : 0 };
        summary.total.infoCount += infoCount;
        summary.total.warnCount += warnCount;
        summary.total.errorCount += errorCount;

        I18N.set(totalSummaryElem, "textContent", "message.report_summary",
          summary.total.errorCount, summary.total.warnCount);
        application.i18n.update(totalSummaryElem);
      }
    }
    catch (ex)
    {
      this.addError(title, ex);
    }
  }

  /**
   * Runs a report.
   * @deprecated use runReports({source, type})
   *
   * @param {string} name - the report name
   * @param {string} source - the report source
   * @param {string} type - the report type
   */
  execute(name, source, type)
  {
    this.runReports({ source, type });
    this.title = name;
  }

  addTitle(title)
  {
    const titleElem = document.createElement("div");
    titleElem.textContent = title;
    titleElem.className = "report-title";
    this.reportElem.appendChild(titleElem);
  }

  addError(title, error)
  {
    const message = error.message || error;
    const errorElem = document.createElement("div");
    errorElem.textContent = title ? title + ": " + message : message;
    errorElem.className = "report-error";
    this.reportElem.appendChild(errorElem);
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