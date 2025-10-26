# BIMROCKET

[![Java CI with Maven](https://github.com/bimrocket/bimrocket/actions/workflows/maven.yml/badge.svg)](https://github.com/bimrocket/bimrocket/actions/workflows/maven.yml)

BIMROCKET is an open source platform for BIM project management.

It provides a web application for viewing, editing and analyzing BIM models and
backend services for storing related information (BCF topics, IFC objects, ...) in a database (OrientDB or MongoDB).

## features
Parametric design tool based on [CSG](https://en.wikipedia.org/wiki/Constructive_solid_geometry).
- Supported graphic primitives: solids, profiles (2d shapes) and cords (3d polylines).
- Profile/cord creation and editing.
- Extrusion and revolution of profiles to create solids.
- Union, intersection and subtraction of solids.
- Object transformation (translation, rotation, scale).
- Definition of formulas for object property values.
- Measuring tools (length, angle, area and volume).
- Orbit-Pan-Zoom tool.
- Fly tool (with collision detection and ground distance control).
- Multiple selection tools: by point, by box, by property, by QR code or by context.
- Face selection tool.
- Editing of model structure and object properties.
- Dynamic sectioning of models.
- Realistic shading: shadow casting and ambient occlusion.
- Solar simulation tool.
- Vertex, egde and face snapping in the drawing, measurement and transformation tools.
- Scripting tool (using javascript language).
- Reporting tool to check conditions on the model objects (supported reporting formats: BRS and [IDS](https://www.buildingsmart.org/what-is-information-delivery-specification-ids/)).
- Object controllers (a Controller is a program that changes the state of an object when a certain event occurs).
- BIM Inventory tool to list the IFC object types, classifications, groups and layers of the model.
- BIM Layout tool to visualize the interior layout of the building.
- BIM Inspector tool to inspect the IFC entities of the model.
- BIM Delta tool to detect changes between two versions of an IFC file.
- Search tool to find model properties by name or by value.
- Histogram tool to visualize the distribution of values ​​for a given property.
- Multiple file storage systems are supported: webdav server, local file system and IndexedDB.
- Load/Export IFC models. Support for multiple IFC schemas (IFC2X3, IFC4 and IFC4X3_ADD2).
- Load/Export models in BRF format (JSON Bimrocket format).
- Load/Export models in STL, GLB, Wavefront OBJ and Collada formats.
- Integrated with external services (some of them provided by **bimrocket-server**)
  - Webdav server where models, scripts, reports and other files are stored.
  - [BCF](https://en.wikipedia.org/wiki/BIM_Collaboration_Format) service (*BIM Collaboration Service*)
  - [bSDD](https://www.buildingsmart.org/users/services/buildingsmart-data-dictionary/) service (*buildingSmart Data Dictionary*)
  - [WFS](https://www.ogc.org/es/publications/standard/wfs/) service (*OGC Web Feature Service*)
  - [Brain4it](http://brain4it.org) (AI platform oriented to the IoT)
  - Bimrocket IFCDB service (stores IFC objects in a database)
  - Bimrocket security service (user and role management)
  - Bimrocket print service (generates a PDF file with vector geometries)
- Data for **bimrocket-server** services can be stored in OrientDB or MongoDB.
- Modular design to easily extend functionality.
- Web application with a responsive user interface. Support for touch devices.
- Multi-language support (currently available in english, spanish and catalan).
- Based on the [THREE.js](https://threejs.org) graphic library.
- Project built with Maven.

![Facility exterior](/docs/images/screenshot1.png?raw=true "Facility exterior")

![Facility interior](/docs/images/screenshot2.png?raw=true "Facility interior")

For more information, please visit this website: <https://bimrocket.github.io>

Try it: <https://bim.santfeliu.cat>
