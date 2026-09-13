/**
 * BRSReportType.js
 *
 * @author realor
 */

import { ReportType } from "platform/reports/ReportType.js";
import { BRSReport, BRSRule } from "./BRSReport.js";

class BRSReportType extends ReportType
{
  constructor()
  {
    super();
  }

  getDescription()
  {
    return "BIMROCKET Specification (BRS)";
  }

  getSourceLanguage()
  {
    return "javascript";
  }

  getDefaultSource()
  {
    return `let rules = [
  {
    "code": "rule_code",
    "description": "description",
    "minOccurs": 0,
    "maxOccurs": null,
    "severity": "info",
    "selectExpression": $ => $("IFC", "ifcClassName") == "IfcDoor",
    "checkExpression": $ => $("IFC", "PrefefinedType") == "Basic",
    "message": object => "check message",
    "summary": objects => "summary message"
  }];
`;
  }

  parse(source)
  {
    const report = new BRSReport();

    let fn = new Function(source + "; return rules;");
    let ruleDefinitions = fn();

    for (let ruleDefinition of ruleDefinitions)
    {
      let rule = new BRSRule(ruleDefinition);
      report.rules.push(rule);
    }

    return report;
  }
}

ReportType.setReportType("brs", new BRSReportType());

export { BRSReportType };

