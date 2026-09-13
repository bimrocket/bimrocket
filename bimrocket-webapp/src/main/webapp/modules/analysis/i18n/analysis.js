/**
 * analysis.js
 *
 * @author realor
 */

export const translations =
{
  "menu.analysis": "Analysis",
  "menu.measure": "Measure",

  "button.exposure": "Exposure",
  "button.select_position": "Select position",
  "button.select_surfaces": "Select surfaces",

  "tool.histogram.label": "Histogram",

  "tool.measure_angle.label": "Measure angle",
  "tool.measure_angle.select_first_point": "Select first point.",
  "tool.measure_angle.select_second_point": "Select second point.",
  "tool.measure_angle.select_third_point": "Select third point.",

  "tool.measure_area.label": "Measure area",
  "tool.measure_area.help": "Draw the area to measure.",

  "tool.measure_length.label": "Measure length",
  "tool.measure_length.help": "Draw the line to measure.",

  "tool.measure_selection.label": "Measure selection",

  "tool.report.label": "Reports",
  "tool.report.name": "Report name:",
  "tool.report.rules": "Rules:",

  "tool.search.label": "Search",

  "tool.solar_simulator.label": "Solar simulator",
  "tool.solar_simulator.select_position": "Select position in the scene to calculate the sun azimuth and elevation.",
  "tool.solar_simulator.drag": "Change time by dragging the pointer on the graph.",
  "tool.solar_simulator.cast_shadows": "Cast shadows",
  "tool.solar_simulator.adjust_intensity": "Adjust solar intensity",
  "tool.solar_simulator.max_length_info": "Maximum length of triangle sides in phase 1",
  "tool.solar_simulator.max_area_info": "Maximum area of ​​the triangles in phase 2",

  "action.create_report": "Create report",
  "action.report": "Report",
  "action.run_report": "Run report",
  "action.edit_report": "Edit report",

  "label.property_set": "Property set:",
  "label.property": "Property:",
  "label.group_by": "Group by:",
  "label.order_by": "Order by:",
  "label.highlight": "Highlight:",
  "label.show_undefined": "Show undefined",
  "label.undefined": "Undefined",

  "label.report_type": "Report type:",

  "label.text_to_find": "Text to find:",
  "label.search_by_name": "Search by property name",
  "label.search_by_value": "Search by property value",
  "label.case_sensitive": "Case sensitive",

  "label.date": "Date:",
  "label.time": "Time:",
  "label.azimuth": "Azimuth:",
  "label.elevation": "Elevation:",
  "label.longitude": "Longitude:",
  "label.latitude": "Latitude:",
  "label.max_length": "Max. length:",
  "label.max_area": "Max. area:",

  "option.no_groups": "Without groups",
  "option.value_asc": "Value (ascending)",
  "option.value_desc": "Value (descending)",
  "option.occurrences_asc": "Occurrences (ascending)",
  "option.occurrences_desc": "Occurrences (descending)",
  "option.highlight_disabled": "Disabled",
  "option.highlight_random_colors": "Random colors",
  "option.highlight_color_grading": "Color grading",

  "message.measure_length": (length, units) => `Length: ${length} ${units}`,
  "message.measure_area": (area, units) => `Area: ${area} ${units}2`,
  "message.measure_angle": angle => `Angle: ${angle} degrees`,

  "message.solid_count": count => `Solid count: ${count}`,
  "message.mesh_count": count => `Mesh count: ${count}`,
  "message.total_area": (area, units) => `Area: ${area} ${units}2`,
  "message.total_volume": (volume, units) => `Volume: ${volume} ${units}3`,
  "message.area_volume_ratio": ratio => `Area/Volume: ${ratio}`,

  "message.no_matches": "No matches found.",
  "message.one_match": "1 match found.",
  "message.matches_count": count => `${count} matches found.`,

  "message.solar_simulator_select_faces": "Select the surface for which you want to calculate solar exposure using the face selection tool.",

  "title.report_editor": "Report editor",
  "title.report_type": "New report"
};
